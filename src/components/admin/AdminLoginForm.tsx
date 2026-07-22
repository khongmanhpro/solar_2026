"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiClientError, requestJson } from "@/lib/api-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      await requestJson<{ authenticated: true }>("/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      router.replace("/admin");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Không thể đăng nhập lúc này. Vui lòng thử lại.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="username">
          Tài khoản quản trị
        </label>
        <input
          autoComplete="username"
          className="admin-field"
          disabled={submitting}
          id="username"
          name="username"
          required
          type="text"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-[var(--ink)]" htmlFor="password">
          Mật khẩu
        </label>
        <input
          autoComplete="current-password"
          className="admin-field"
          disabled={submitting}
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {error ? (
        <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-soft)] p-3 text-sm font-medium text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <button className="admin-primary-button w-full" disabled={submitting} type="submit">
        {submitting ? "Đang xác thực…" : "Vào phòng điều độ"}
      </button>
    </form>
  );
}
