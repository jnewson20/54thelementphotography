"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const [service, setService] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const serviceParam = searchParams.get("service");
    if (serviceParam) {
      setService(serviceParam);
    }

    const scrollToForm = () => {
      if (window.location.hash === "#contact" || serviceParam) {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstInput = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
        firstInput?.focus();
      }
    };

    scrollToForm();
    window.addEventListener("hashchange", scrollToForm);
    return () => window.removeEventListener("hashchange", scrollToForm);
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    setConfirmationMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, service }),
      });

      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Server returned non-JSON response (${response.status}): ${text.slice(0, 200)}`
        );
      }

      if (!response.ok) {
        throw new Error(result?.error || `Unable to send inquiry (${response.status})`);
      }

      setStatus("success");
      setConfirmationMessage(result?.message || "Your inquiry was sent successfully.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (error) {
      setErrorMessage((error as Error).message || "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <form ref={formRef} className="grid gap-3 max-w-xl" onSubmit={handleSubmit}>
      <label className="flex flex-col">
        Name
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="mt-1 p-2 rounded-md bg-black/10 border-0 text-black"
        />
      </label>
      <label className="flex flex-col">
        Email
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="mt-1 p-2 rounded-md bg-black/10 border-0 text-black"
        />
      </label>
            <label className="flex flex-col">
        Phone
        <input
          name="phone"
          type="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
          className="mt-1 p-2 rounded-md bg-black/10 border-0 text-black"
        />
      </label>
      {service && (
        <p className="text-sm text-slate-700">
          Inquiry for: <span className="font-semibold">{service}</span>
        </p>
      )}
      <label className="flex flex-col">
        Message
        <textarea
          name="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          className="mt-1 p-2 rounded-md bg-black/10 border-0 text-black"
        />
      </label>

      <button
        className="btn-accent w-max"
        type="submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending..." : "Send"}
      </button>

      {status === "success" && confirmationMessage && (
        <p className="text-md text-gray-900">{confirmationMessage}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}
    </form>
  );
}
