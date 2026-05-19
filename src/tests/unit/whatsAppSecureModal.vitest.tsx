import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WhatsAppSecureModal } from "../../components/common/WhatsAppSecureModal";

describe("WhatsAppSecureModal", () => {
  it("désactive le submit quand le mot de passe est invalide", () => {
    render(
      <WhatsAppSecureModal
        open
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const submit = screen.getByRole("button", { name: /sécuriser et envoyer/i });
    expect(submit).toBeDisabled();
  });

  it("soumet quand le mot de passe est valide", () => {
    const onSubmit = vi.fn();
    render(
      <WhatsAppSecureModal
        open
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("********"), { target: { value: "MonSecret12" } });
    fireEvent.click(screen.getByRole("button", { name: /sécuriser et envoyer/i }));

    expect(onSubmit).toHaveBeenCalledWith("MonSecret12");
  });

  it("affiche la force du mot de passe", () => {
    render(
      <WhatsAppSecureModal
        open
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("********"), { target: { value: "abcdef" } });
    expect(screen.getByText(/sécurité:/i)).toBeInTheDocument();
    expect(screen.getByText(/moyenne/i)).toBeInTheDocument();
  });
});