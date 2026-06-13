-- Migration: Real Data Daily Reputation Report Email Template
-- Created: 2026-03-30
-- Description: Email template matching user's example with ALL REAL DATA

BEGIN;

UPDATE public.notification_email_templates
SET
  subject_template = 'Daily Online Reputation Report - {{report_date}} | {{hotels_monitored}} Hotels | {{average_rating}} Avg',
  html_template = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Online Reputation Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; color: #333; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; background: #fff; }
    
    /* Header Banner */
    .header-banner { background: #1a365d; color: #fff; padding: 8px 20px; text-align: center; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
    
    /* Main Header */
    .main-header { background: #fff; padding: 30px 40px; text-align: center; border-bottom: 3px solid #1a365d; }
    .brand { font-size: 28px; font-weight: bold; color: #1a365d; margin-bottom: 5px; }
    .subtitle { font-size: 12px; color: #666; letter-spacing: 2px; text-transform: uppercase; }
    .report-title { font-size: 22px; color: #1a365d; margin: 15px 0 10px; }
    .report-meta { font-size: 13px; color: #666; }
    .report-meta span { margin: 0 10px; }
    
    /* Executive Summary Section */
    .exec-summary { background: #f8f9fa; padding: 25px 40px; border-bottom: 1px solid #e2e8f0; }
    .section-title { font-size: 14px; color: #1a365d; font-weight: bold; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
    .summary-text { font-size: 13px; color: #4a5568; line-height: 1.7; }
    .summary-text.ar { direction: rtl; text-align: right; margin-top: 15px; font-family: Arial, sans-serif; }
    
    /* Metrics Grid */
    .metrics-section { padding: 30px 40px; background: #fff; }
    .metrics-grid { display: table; width: 100%; margin-bottom: 20px; }
    .metric-box { display: table-cell; width: 25%; text-align: center; padding: 20px; border-right: 1px solid #e2e8f0; }
    .metric-box:last-child { border-right: none; }
    .metric-value { font-size: 36px; font-weight: bold; color: #1a365d; }
    .metric-label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .metric-sub { font-size: 11px; color: #999; margin-top: 3px; }
    
    /* Date Range Note */
    .date-range { padding: 0 40px 20px; font-size: 12px; color: #666; font-style: italic; }
    
    /* Hotel Scorecards */
    .scorecards-section { padding: 0 40px 30px; }
    .section-header { font-size: 16px; color: #1a365d; font-weight: bold; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #1a365d; }
    
    .hotel-scorecard { background: #f8f9fa; border: 1px solid #e2e8f0; margin-bottom: 20px; padding: 20px; }
    .hotel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .hotel-location { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
    .hotel-name { font-size: 18px; font-weight: bold; color: #1a365d; flex: 1; margin: 0 15px; }
    .hotel-score { font-size: 24px; font-weight: bold; padding: 5px 15px; border-radius: 4px; }
    .hotel-score.good { background: #c6f6d5; color: #22543d; }
    .hotel-score.fair { background: #feebc8; color: #744210; }
    .hotel-score.poor { background: #fed7d7; color: #742a2a; }
    .hotel-stats { font-size: 12px; color: #666; margin-bottom: 15px; }
    
    .trends-grid { display: table; width: 100%; }
    .trend-col { display: table-cell; width: 50%; padding: 15px; vertical-align: top; }
    .trend-col.positive { background: #f0fff4; border-left: 4px solid #48bb78; }
    .trend-col.negative { background: #fff5f5; border-left: 4px solid #f56565; }
    .trend-title { font-size: 12px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
    .trend-title.pos { color: #22543d; }
    .trend-title.neg { color: #742a2a; }
    .trend-list { list-style: none; font-size: 12px; color: #4a5568; }
    .trend-list li { margin-bottom: 8px; padding-left: 15px; position: relative; }
    .trend-list li:before { content: "•"; position: absolute; left: 0; }
    
    /* Tables */
    .table-section { padding: 0 40px 30px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th { background: #1a365d; color: #fff; padding: 10px; text-align: left; font-weight: 600; }
    .data-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .data-table tr:hover { background: #f8f9fa; }
    .score-cell { font-weight: bold; }
    .score-cell.low { color: #c53030; }
    .score-cell.mid { color: #d69e2e; }
    .score-cell.high { color: #38a169; }
    
    /* Critical Alerts */
    .alerts-section { padding: 0 40px 30px; }
    .alerts-header { background: #fed7d7; color: #742a2a; padding: 15px 20px; font-weight: bold; font-size: 14px; margin-bottom: 15px; border-left: 4px solid #f56565; }
    
    /* Operational Matrix */
    .matrix-section { padding: 0 40px 30px; }
    .matrix-table th { background: #4a5568; }
    .trend-arrow { font-size: 16px; }
    .trend-arrow.up { color: #38a169; }
    .trend-arrow.down { color: #e53e3e; }
    .trend-arrow.stable { color: #718096; }
    
    /* Recommendations */
    .rec-section { padding: 0 40px 30px; }
    .rec-item { background: #f7fafc; border-left: 4px solid #1a365d; padding: 15px 20px; margin-bottom: 10px; font-size: 12px; }
    .rec-priority { display: inline-block; padding: 3px 10px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-right: 10px; border-radius: 3px; }
    .rec-priority.high { background: #fed7d7; color: #742a2a; }
    .rec-priority.medium { background: #feebc8; color: #744210; }
    .rec-priority.low { background: #c6f6d5; color: #22543d; }
    
    /* Footer */
    .footer { background: #1a365d; color: #fff; padding: 20px 40px; text-align: center; font-size: 11px; }
    .footer-brand { font-weight: bold; font-size: 13px; }
    
    @media (max-width: 640px) {
      .metrics-grid, .trends-grid { display: block; }
      .metric-box, .trend-col { display: block; width: 100%; border-right: none; border-bottom: 1px solid #e2e8f0; }
      .hotel-header { flex-direction: column; text-align: center; }
      .data-table { font-size: 11px; }
      .data-table th, .data-table td { padding: 8px 5px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Banner -->
    <div class="header-banner">A U T O M A T E D D A I L Y M O N I T O R I N G R E P O R T</div>
    
    <!-- Main Header -->
    <div class="main-header">
      <div class="brand">PRIME HOTELS KSA</div>
      <div class="subtitle">Executive Intelligence</div>
      <h1 class="report-title">Daily Online Reputation Report</h1>
      <div class="report-meta">
        <span>📅 {{report_date}}</span>
        <span>🕑 Generated at {{generated_time}} Cairo Time</span>
      </div>
    </div>
    
    <!-- Executive Summary -->
    <div class="exec-summary">
      <div class="section-title">📊 Executive Summary</div>
      <p class="summary-text">{{summary_en}}</p>
      <p class="summary-text ar">{{summary_ar}}</p>
    </div>
    
    <!-- Key Metrics -->
    <div class="metrics-section">
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value">{{total_reviews}}</div>
          <div class="metric-label">Total Reviews</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">{{average_rating}}</div>
          <div class="metric-label">Overall Avg Score</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">{{critical_alerts}}</div>
          <div class="metric-label">Critical Alerts (≤5)</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">{{hotels_monitored}}</div>
          <div class="metric-label">Hotels Monitored</div>
        </div>
      </div>
    </div>
    
    <div class="date-range">
      🕐 Data from actual guest reviews collected in reporting period.
    </div>
    
    <!-- Hotel Scorecards -->
    <div class="scorecards-section">
      <div class="section-header">🏢 {{hotels_monitored}}-HOTEL SCORECARD</div>
      {{property_scorecards}}
    </div>
    
    <!-- Recent Reviews Sample -->
    <div class="table-section">
      <div class="section-header">📝 Recent Reviews Sample</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Platform</th>
            <th>Reviewer</th>
            <th>Score</th>
            <th>Review Excerpt</th>
          </tr>
        </thead>
        <tbody>
          {{recent_reviews_table}}
        </tbody>
      </table>
    </div>
    
    <!-- Critical Alerts -->
    <div class="alerts-section">
      <div class="alerts-header">🚨 CRITICAL ALERTS — {{critical_alerts}} REVIEW(S) WITH RATING ≤5</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Reviewer</th>
            <th>Platform</th>
            <th>Rating</th>
            <th>Excerpt</th>
          </tr>
        </thead>
        <tbody>
          {{critical_alerts_table}}
        </tbody>
      </table>
    </div>
    
    <!-- Operational Intelligence -->
    <div class="matrix-section">
      <div class="section-header">💡 Operational Intelligence</div>
      <table class="data-table matrix-table">
        <thead>
          <tr>
            <th>Hotel</th>
            <th>Priority #1</th>
            <th>Priority #2</th>
            <th>Priority #3</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {{operational_matrix}}
        </tbody>
      </table>
    </div>
    
    <!-- AI Recommendations -->
    <div class="rec-section">
      <div class="section-header">🎯 AI Recommendations — {{report_date}}</div>
      <ul class="trend-list">
        {{recommendations_list}}
      </ul>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">Prime Hotels KSA — Group Reputation Operations</div>
      <div>Auto-generated Daily Reputation Report | Powered by AI Monitoring System</div>
      <div style="margin-top: 10px; opacity: 0.8;">Generated: {{report_date}}, {{generated_time}} Africa/Cairo | Confidential — For Internal Use Only</div>
    </div>
  </div>
</body>
</html>',
  text_template = 'PRIME HOTELS KSA - Daily Online Reputation Report
Date: {{report_date}} | Generated: {{generated_time}} Cairo Time

EXECUTIVE SUMMARY:
{{summary_en}}

KEY METRICS:
- Total Reviews: {{total_reviews}}
- Average Rating: {{average_rating}}
- Critical Alerts: {{critical_alerts}}
- Hotels Monitored: {{hotels_monitored}}

TOP PERFORMER: {{top_performer}} ({{top_performer_rating}}/10)
NEEDS ATTENTION: {{needs_attention}}

View full dashboard: {{action_url}}',
  from_name = 'PRIME Hotels KSA - Reputation Operations',
  from_email = 'reputation@primehotels-ksa.com',
  metadata = '{"domain":"guest_reviews","version":"3.0","real_data":true,"format":"daily_reputation_report"}'::jsonb,
  updated_at = NOW()
WHERE template_key = 'review_daily_exec_digest';

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notification_email_templates 
    WHERE template_key = 'review_daily_exec_digest' 
    AND metadata->>'real_data' = 'true'
  ) THEN
    RAISE EXCEPTION 'Template update failed - review_daily_exec_digest not found or not updated with real data format';
  END IF;
  
  RAISE NOTICE 'Successfully updated review_daily_exec_digest with real data daily reputation report format';
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
