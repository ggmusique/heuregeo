import "@testing-library/jest-dom";

// Mock Supabase — aucun appel réseau réel pendant les tests
vi.mock("../services/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-uid" } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock LabelsContext — utilisé dans useMissions
vi.mock("../contexts/LabelsContext", () => ({
  LabelsContext: {},
  useLabels: () => ({
    client: "Client",
    lieu: "Lieu",
    patron: "Patron",
  }),
}));