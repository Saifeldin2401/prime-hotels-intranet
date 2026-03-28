import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

function timingSafeBearerMatch(authHeader: string | null, secret: string): boolean {
  if (!authHeader || !secret) return false;
  const expected = `Bearer ${secret}`;
  if (authHeader.length !== expected.length) return false;
  const a = new TextEncoder().encode(authHeader);
  const b = new TextEncoder().encode(expected);
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

function buildWindow(reportDate?: string) {
  if (reportDate) {
    const end = new Date(`${reportDate}T04:00:00.000Z`); // 07:00 Asia/Riyadh
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return { start, end };
  }
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: vaultServiceSecret } = await supabase
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .filter("name", "eq", "service_role_key")
      .limit(1)
      .maybeSingle();

    const isInternal = timingSafeBearerMatch(authHeader, serviceRoleKey)
      || (typeof vaultServiceSecret?.decrypted_secret === "string" &&
        timingSafeBearerMatch(authHeader, vaultServiceSecret.decrypted_secret));

    if (!isInternal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST"
      ? await req.json().catch(() => ({} as Record<string, unknown>))
      : ({} as Record<string, unknown>);
    const reportDate = typeof body.report_date === "string" ? body.report_date : undefined;

    const appBaseUrl = Deno.env.get("APP_BASE_URL") ?? "https://phg-connect.com";

    const { start, end } = buildWindow(reportDate);
    
    // 1. Fetch Reviews
    const { data: reviews, error: reviewsErr } = await supabase
      .from("guest_reviews")
      .select("id,property_id,platform,sentiment,severity,status,rating_normalized_10,summary_en,critical_flag,response_sla_due_at,responded_at,created_at")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
    if (reviewsErr) throw reviewsErr;

    const reviewRows = reviews ?? [];
    const totalReviews = reviewRows.length;
    
    if (totalReviews === 0) {
      return new Response(JSON.stringify({ success: true, message: "No reviews found for this window." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Issues for distribution analysis
    const reviewIds = reviewRows.map(r => r.id);
    const { data: issues } = await supabase
      .from("guest_review_issues")
      .select("review_id, issue_category")
      .in("review_id", reviewIds);

    const issueDistribution = new Map<string, number>();
    (issues ?? []).forEach(iss => {
      const cat = iss.issue_category ?? "Uncategorized";
      issueDistribution.set(cat, (issueDistribution.get(cat) ?? 0) + 1);
    });

    const topIssuesList = Array.from(issueDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 3. Calculate Core Metrics
    const rated = reviewRows.filter((r) => r.rating_normalized_10 != null);
    const averageRating = rated.length > 0
      ? Number((rated.reduce((sum, r) => sum + Number(r.rating_normalized_10 ?? 0), 0) / rated.length).toFixed(1))
      : 0;
    const negativeReviewsCount = reviewRows.filter((r) => r.sentiment === "negative" || Number(r.rating_normalized_10 ?? 10) <= 6).length;
    const slaMet = reviewRows.filter((r) => 
      !r.response_sla_due_at || (r.responded_at && new Date(r.responded_at) <= new Date(r.response_sla_due_at))
    ).length;
    const slaCompliance = totalReviews > 0 ? Number(((slaMet / totalReviews) * 100).toFixed(1)) : 100;

    // 4. Property Breakdown
    const propertyCounts = new Map<string, { count: number; neg: number; totalRating: number; rated: number; topIssue: string }>();
    for (const r of reviewRows) {
      const key = String(r.property_id ?? "");
      const entry = propertyCounts.get(key) ?? { count: 0, neg: 0, totalRating: 0, rated: 0, topIssue: "N/A" };
      entry.count += 1;
      if (r.sentiment === "negative" || Number(r.rating_normalized_10 ?? 10) <= 6) entry.neg += 1;
      if (r.rating_normalized_10 != null) {
        entry.totalRating += Number(r.rating_normalized_10);
        entry.rated += 1;
      }
      
      // Assign first category found for property as "main issue" for the table if not set
      if (entry.topIssue === "N/A") {
        const reviewIssue = (issues ?? []).find(iss => iss.review_id === r.id);
        if (reviewIssue) entry.topIssue = reviewIssue.issue_category;
      }
      
      propertyCounts.set(key, entry);
    }

    const { data: properties } = await supabase.from("properties").select("id,name").in("id", Array.from(propertyCounts.keys()));
    const propertyNameMap = new Map((properties ?? []).map((p) => [String(p.id), p.name]));

    // 5. Generate AI Narrative Summary (Bilingual)
    let summaryEn = "A comprehensive analysis of guest feedback across all active properties for the reporting period.";
    let summaryAr = "تحليل شامل لتعليقات الضيوف عبر جميع الفنادق النشطة خلال فترة التقرير.";
    
    try {
      const sampleReviews = reviewRows
        .filter(r => r.sentiment === "negative" || r.critical_flag)
        .slice(0, 10)
        .map(r => `- [${r.platform}] ${r.rating_normalized_10}/10: ${r.summary_en ?? "No summary"}`)
        .join("\n");

      const aiResponse = await fetch(`${supabaseUrl}/functions/v1/process-ai-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "chat",
          prompt: `As a Hospitality Executive Consultant for PRIME Hotels, analyze the guest review data for ${end.toDateString()}. 
          Total Reviews: ${totalReviews}
          Avg Rating: ${averageRating}/10
          Issues Detected: ${JSON.stringify(Object.fromEntries(issueDistribution))}
          
          Key Critical/Negative feedback samples:
          ${sampleReviews}
          
          Provide a concise, professional executive narrative highlighting major themes, operational strengths, and urgent areas requiring management focus. 
          
          YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT WITH THESE FIELDS:
          "summary_en": "Professional executive narrative in English (2-3 paragraphs)",
          "summary_ar": "Professional executive narrative in Arabic (2-3 paragraphs, formal business style)"
          Do not include any other text.`,
        }),
      }).then(res => res.json()).catch(() => null);

      if (aiResponse?.success && aiResponse?.response) {
        try {
          const parsed = JSON.parse(aiResponse.response);
          if (parsed.summary_en) summaryEn = parsed.summary_en;
          if (parsed.summary_ar) summaryAr = parsed.summary_ar;
        } catch (e) {
          console.warn("AI narrative parsing failed, trying raw string:", e);
          summaryEn = aiResponse.response;
        }
      }
    } catch (e) {
      console.warn("AI Narrative generation failed:", e);
    }

    // 6. Build HTML Components
    const propertyTableHtml = Array.from(propertyCounts.entries()).map(([pid, entry]) => {
      const name = propertyNameMap.get(pid) ?? "Unknown Property";
      const avg = entry.rated > 0 ? (entry.totalRating / entry.rated).toFixed(1) : "N/A";
      const ratingClass = Number(avg) >= 8 ? "rating-excellent" : Number(avg) >= 6 ? "rating-good" : "rating-poor";
      return `
        <tr>
            <td class="property-name">${name}</td>
            <td style="text-align: center;">${entry.count}</td>
            <td style="text-align: center;"><span class="rating-chip ${ratingClass}">${avg}</span></td>
            <td style="color: #64748b; font-size: 12px;">${entry.topIssue}</td>
        </tr>`;
    }).join("");

    const topIssuesHtml = topIssuesList.map(([cat, count]) => `
      <div class="issue-item">
          <div class="issue-category">${cat}</div>
          <div class="issue-count">${count} mentions</div>
      </div>`).join("");

    const reportDateValue = reportDate ? reportDate : end.toISOString().slice(0, 10);
    
    // 7. Save and Send
    const { data: reportRow, error: reportErr } = await supabase
      .from("guest_review_daily_reports")
      .insert({
        report_date: reportDateValue,
        scope_level: "group",
        title: `Guest Review Executive Digest - ${reportDateValue}`,
        summary_json: {
          total_reviews: totalReviews,
          average_rating: averageRating,
          negative_count: negativeReviewsCount,
          sla_compliance: slaCompliance,
          issue_distribution: Object.fromEntries(issueDistribution),
          narrative_en: summaryEn,
          narrative_ar: summaryAr
        },
        status: "completed",
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (reportErr) throw reportErr;

    const { data: recipients } = await supabase
      .from("guest_review_report_recipients")
      .select("email")
      .eq("is_active", true);

    const emails = Array.from(new Set((recipients ?? []).map((r) => String((r as any).email ?? "").trim()).filter(Boolean)));

    if (emails.length > 0) {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emails,
          templateKey: "review_daily_exec_digest",
          businessDomain: "management",
          notificationType: "system",
          title: `Executive Intelligence: Guest Review Analysis - ${reportDateValue}`,
          actionUrl: `${appBaseUrl.replace(/\/+$/, "")}/reviews?tab=executive`,
          variables: {
            report_date: reportDateValue,
            total_reviews: totalReviews.toString(),
            average_rating: `${averageRating}/10`,
            negative_reviews: negativeReviewsCount.toString(),
            sla_compliance: `${slaCompliance}%`,
            summary_en: summaryEn,
            summary_ar: summaryAr,
            property_table: propertyTableHtml,
            top_issues: topIssuesHtml
          },
        }),
      }).catch(err => console.error("Email send failed:", err));

      await supabase
        .from("guest_review_daily_reports")
        .update({ emailed_to: emails })
        .eq("id", reportRow.id);
    }

    return new Response(JSON.stringify({
      success: true,
      report_id: reportRow.id,
      message: `Report generated for ${reportDateValue} with ${totalReviews} reviews. Sent to ${emails.length} recipients.`
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("guest-review-daily-report failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

