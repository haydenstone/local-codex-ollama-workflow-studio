"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type OllamaModel = { name: string };
const endpoint = "http://127.0.0.1:11434";
const starter: ChatMessage[] = [{ role: "assistant", content: "Local agent ready. I can help plan, inspect, and build inside your approved workspace." }];

export default function Home() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<"checking" | "ready" | "offline">("checking");
  const [messages, setMessages] = useState<ChatMessage[]>(starter);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const statusLabel = useMemo(() => status === "ready" ? "Ollama connected" : status === "offline" ? "Ollama unavailable" : "Checking local Ollama…", [status]);

  async function checkOllama() {
    setStatus("checking");
    try {
      const response = await fetch(`${endpoint}/api/tags`);
      if (!response.ok) throw new Error("Local service did not respond");
      const data = (await response.json()) as { models?: OllamaModel[] };
      const found = data.models ?? [];
      setModels(found);
      setModel((current) => current || found.find((item) => item.name.includes("0.5b"))?.name || found[0]?.name || "");
      setStatus("ready");
    } catch { setStatus("offline"); }
  }
  useEffect(() => { void checkOllama(); }, []);

  async function send(event: FormEvent) {
    event.preventDefault(); const text = prompt.trim(); if (!text || !model || sending) return;
    const next = [...messages, { role: "user" as const, content: text }]; setMessages(next); setPrompt(""); setSending(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 90000);
      const response = await fetch(`${endpoint}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: "You are a local coding agent in a proof of concept. Be concise, explain your proposed plan before any potentially destructive action, and never claim a tool action has occurred unless it was actually performed." }, ...next] }) });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error("Chat request failed");
      const data = (await response.json()) as { message?: ChatMessage };
      setMessages((current) => [...current, data.message ?? { role: "assistant", content: "No reply received." }]);
    } catch { setMessages((current) => [...current, { role: "assistant", content: "The local model did not answer in time. Try the lightweight coder model or reconnect Ollama, then send again." }]); setStatus("offline"); }
    finally { setSending(false); }
  }
  return <main className="shell">
    <aside className="sidebar"><div className="brand"><span>◈</span> LOCAL CODEX</div><button className="newChat" onClick={() => setMessages(starter)}>+ New agent run</button><div className="railLabel">WORKFLOW</div><div className="workflow"><div className="active">01&nbsp;&nbsp; Plan</div><div>02&nbsp;&nbsp; Build</div><div>03&nbsp;&nbsp; Validate</div><div>04&nbsp;&nbsp; Remember</div></div><div className="sideFooter">POC · local-first · human-approved</div></aside>
    <section className="workspace"><header><div><p className="eyebrow">AGENT WORKSPACE</p><h1>Ollama workflow studio</h1></div><div className={`connection ${status}`}><i />{statusLabel}</div></header>
      <div className="contextBar"><div><span>MODEL</span><select value={model} onChange={(e) => setModel(e.target.value)} disabled={!models.length}>{models.length ? models.map((item) => <option key={item.name}>{item.name}</option>) : <option>Loading local models…</option>}</select></div><div><span>RUNTIME</span><b>127.0.0.1:11434</b></div><button className="quietButton" onClick={() => void checkOllama()}>Reconnect</button></div>
      <section className="conversation" aria-label="Agent conversation"><div className="intro"><div className="orb">◈</div><div><p className="eyebrow">PROOF OF CONCEPT</p><h2>From intent to verified work.</h2><p>Use this local agent to turn a request into a plan, controlled changes, and evidence of completion.</p></div></div>{messages.map((message, index) => <article className={`message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "AGENT" : "YOU"}</span><p>{message.content}</p></article>)}{sending && <article className="message assistant"><span>AGENT</span><p className="typing">Thinking locally</p></article>}</section>
      <form className="composer" onSubmit={send}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what you want to create or change…" rows={2} /><button type="submit" disabled={!prompt.trim() || !model || sending}>Send <span>↗</span></button></form>{status === "offline" && <p className="notice">The interface is ready, but the browser cannot currently reach local Ollama. This usually means the service is stopped or its local browser-access setting needs attention.</p>}</section>
  </main>;
}
