// src/components/layout/Sidebar.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "../../i18n"; // تهيئة i18next قبل أي render يستخدم useTranslation
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "../../store/authStore";

beforeEach(() => {
  useAuthStore.setState({ userId: 1, role: "cashier", isAuthenticated: true });
});

describe("Sidebar — صلاحيات الأدوار", () => {
  it("⭐ يُخفي كل الروابط الحسّاسة (owner-only) فعليًا عن حساب Cashier", () => {
    render(<Sidebar active="pos" onNavigate={() => {}} />);

    expect(screen.queryByText("المنتجات")).not.toBeInTheDocument();
    expect(screen.queryByText("الموردون")).not.toBeInTheDocument();
    expect(screen.queryByText("التقارير")).not.toBeInTheDocument();
    expect(screen.queryByText("الموظفون")).not.toBeInTheDocument();
    expect(screen.queryByText("الإعدادات")).not.toBeInTheDocument();
  });

  it("يُبقي الروابط العامة (بيع، مخزون، صندوق) ظاهرة للكاشير", () => {
    render(<Sidebar active="pos" onNavigate={() => {}} />);

    expect(screen.getByText("نقطة البيع")).toBeInTheDocument();
    expect(screen.getByText("المخزون")).toBeInTheDocument();
    expect(screen.getByText("الصندوق")).toBeInTheDocument();
  });

  it("يُظهر كل الروابط بلا استثناء لحساب Owner", () => {
    useAuthStore.setState({ role: "owner" });
    render(<Sidebar active="pos" onNavigate={() => {}} />);

    expect(screen.getByText("المنتجات")).toBeInTheDocument();
    expect(screen.getByText("الموردون")).toBeInTheDocument();
    expect(screen.getByText("التقارير")).toBeInTheDocument();
    expect(screen.getByText("الموظفون")).toBeInTheDocument();
    expect(screen.getByText("الإعدادات")).toBeInTheDocument();
  });

  it("يستدعي onNavigate بالمفتاح الصحيح عند الضغط على رابط", () => {
    const onNavigate = vi.fn();
    render(<Sidebar active="pos" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("المخزون"));
    expect(onNavigate).toHaveBeenCalledWith("inventory");
  });
});
