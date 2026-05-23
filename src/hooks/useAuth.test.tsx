/**
 * Integration tests for AuthProvider + useAuth hook.
 *
 * All Supabase calls are mocked so tests stay offline, fast, and deterministic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./useAuth";

// ── Supabase mock ─────────────────────────────────────────────────────────────
// vi.mock() is hoisted above variable declarations, so mocks must be created
// with vi.hoisted() to be available inside the factory.

const {
  mockSignUp,
  mockSignIn,
  mockSignOut,
  mockOnAuthStateChange,
  mockFromProfiles,
  mockInvoke,
} = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignIn: vi.fn(),
  mockSignOut: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockFromProfiles: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: mockFromProfiles,
        }),
      }),
      update: () => ({
        eq: () => mockFromProfiles(),
      }),
    }),
    functions: { invoke: mockInvoke },
  },
}));

// ── Test component ────────────────────────────────────────────────────────────

function TestConsumer() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="user">{user ? user.email : "no-user"}</span>
      <button onClick={() => signIn("a@b.com", "pass")}>sign-in</button>
      <button onClick={() => signUp("a@b.com", "pass", "Alice")}>sign-up</button>
      <button onClick={() => signOut()}>sign-out</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simulate Supabase firing INITIAL_SESSION with the given session. */
function fireAuthChange(
  event: string,
  session: { user: { id: string; email: string } } | null
) {
  const callback = mockOnAuthStateChange.mock.calls[0][0];
  act(() => callback(event, session));
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockFromProfiles.mockResolvedValue({ data: null, error: null });
  mockInvoke.mockResolvedValue({ data: null, error: null });
  // Default: onAuthStateChange returns a subscription object
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthProvider initial state", () => {
  it("starts in loading state, then becomes ready after INITIAL_SESSION", async () => {
    renderWithAuth();
    expect(screen.getByTestId("loading").textContent).toBe("loading");

    fireAuthChange("INITIAL_SESSION", null);

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("ready")
    );
    expect(screen.getByTestId("user").textContent).toBe("no-user");
  });

  it("sets user when INITIAL_SESSION fires with a session", async () => {
    renderWithAuth();

    fireAuthChange("INITIAL_SESSION", {
      user: { id: "uid-1", email: "alice@example.com" },
    });

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("alice@example.com")
    );
  });
});

describe("signIn", () => {
  it("calls supabase.auth.signInWithPassword with trimmed credentials", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    await act(async () => {
      screen.getByText("sign-in").click();
    });

    expect(mockSignIn).toHaveBeenCalledWith({ email: "a@b.com", password: "pass" });
  });

  it("propagates error from Supabase", async () => {
    const err = new Error("Invalid credentials");
    mockSignIn.mockResolvedValue({ error: err });
    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    const { signIn } = await new Promise<ReturnType<typeof useAuth>>((resolve) => {
      // Get hook reference via a capture component
      function Capture() {
        const auth = useAuth();
        resolve(auth);
        return null;
      }
      render(<AuthProvider><Capture /></AuthProvider>);
      fireAuthChange("INITIAL_SESSION", null);
    });

    const result = await signIn("bad@email.com", "wrong");
    expect(result.error).toBe(err);
  });
});

describe("signUp", () => {
  it("calls supabase.auth.signUp and returns no error on success", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    await act(async () => {
      screen.getByText("sign-up").click();
    });

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com", password: "pass" })
    );
  });

  it("fires Klaviyo subscribe on successful sign-up (non-blocking)", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    mockInvoke.mockResolvedValue({ data: null, error: null });

    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    await act(async () => {
      screen.getByText("sign-up").click();
    });

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith(
      "klaviyo-subscribe",
      expect.objectContaining({ body: { email: "a@b.com", first_name: "Alice" } })
    ));
  });

  it("does NOT fire Klaviyo subscribe when sign-up errors", async () => {
    mockSignUp.mockResolvedValue({ error: new Error("exists") });
    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    await act(async () => {
      screen.getByText("sign-up").click();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it("calls supabase.auth.signOut and removes pending_username from localStorage", async () => {
    mockSignOut.mockResolvedValue(undefined);
    localStorage.setItem("pending_username", "alice");

    renderWithAuth();
    fireAuthChange("INITIAL_SESSION", null);

    await act(async () => {
      screen.getByText("sign-out").click();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(localStorage.getItem("pending_username")).toBeNull();
  });
});

describe("PASSWORD_RECOVERY event", () => {
  it("sets vestis_recovery_mode in sessionStorage", () => {
    renderWithAuth();
    fireAuthChange("PASSWORD_RECOVERY", {
      user: { id: "uid-1", email: "alice@example.com" },
    });
    expect(sessionStorage.getItem("vestis_recovery_mode")).toBe("true");
  });
});
