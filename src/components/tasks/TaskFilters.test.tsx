import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock the hooks
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/contexts/PropertyContext", () => ({
  useProperty: () => ({
    currentProperty: { id: "prop-1", name: "Test Property" },
  }),
}));

// Mock i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("TaskFilters UX/Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    filters: {},
    onChange: vi.fn(),
  };

  it("Search input has correct aria-label", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskFilters {...defaultProps} />
      </QueryClientProvider>,
    );

    const searchInput = screen.getByLabelText("search_placeholder");
    expect(searchInput).toBeDefined();
    expect(searchInput).toHaveAttribute("placeholder", "search_placeholder");
  });

  it("Clear filters button has correct aria-label and tooltip when filters are active", async () => {
    const activeFilters = { status: "todo" };
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TaskFilters {...defaultProps} filters={activeFilters} />
        </TooltipProvider>
      </QueryClientProvider>,
    );

    // The key for clear filters is 'common:common.clear_filters' in our mock
    const clearButton = screen.getByLabelText("common:common.clear_filters");
    expect(clearButton).toBeDefined();

    // Test tooltip
    fireEvent.mouseEnter(clearButton);
    expect(
      await screen.findByText("common:common.clear_filters"),
    ).toBeDefined();
  });

  it("Clear filters button is not visible when no filters are active", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskFilters {...defaultProps} />
      </QueryClientProvider>,
    );

    const clearButton = screen.queryByLabelText("common:common.clear_filters");
    expect(clearButton).toBeNull();
  });
});
