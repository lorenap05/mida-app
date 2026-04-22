import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Download, Upload } from "lucide-react";
import MidaLogo from "@/assets/Mida_logo.jpeg";
import { saveUserData, loadUserData, hasCompletedOnboarding } from "@/lib/userStore";
import { parseFinancialTemplate } from "@/lib/xlsxParser";
import BankConnectionScreen from "@/components/BankConnectionScreen";
import ChatDataTable from "@/components/ChatDataTable";
import type { MonthlyData } from "@/lib/userStore";
import * as XLSX from "xlsx";
import { getMonthColumns } from "@/lib/monthUtils";
import { clearForecastAdjustments } from "@/lib/forecastStore";

// ---------- Gemini helpers ----------

// Builds a personalised system prompt from the user's saved data.
// Gemini receives this with every message so it always knows who it's talking to.
const buildSystemPrompt = (): string => {
  const data = loadUserData();
  const name = data.name || "the user";
  const age  = data.age  || "unknown age";
  const goal = data.goals || "not specified";

  // If the user uploaded 12 months of data, compute a quick financial summary.
  let financialSummary = "No financial data available yet.";
  if (data.financialData && data.financialData.length > 0) {
    const months = data.financialData;
    const avgIncome = months.reduce((s, m) => s + m.income, 0) / months.length;
    const avgExpenses = months.reduce((s, m) => {
      return s + m.rent + m.groceries + m.transport + m.leisure + m.utilities + m.health + m.education + m.others;
    }, 0) / months.length;
    const remaining = avgIncome - avgExpenses;
    financialSummary =
      `Average monthly income: $${avgIncome.toFixed(0)}. ` +
      `Average monthly expenses: $${avgExpenses.toFixed(0)}. ` +
      `Average remaining: $${remaining.toFixed(0)}.`;
  }

  return `You are Mida, a warm and knowledgeable personal finance guide built into a budgeting app.

User profile:
- Name: ${name}
- Age: ${age}
- Financial goal: ${goal}
- Financial summary: ${financialSummary}

Your personality:
- Warm, encouraging, and non-judgmental. You celebrate small wins.
- Always use the user's first name (${name}) to make responses feel personal.
- Give concrete, actionable advice — never vague or generic.
- Never recommend investments or products. Keep guidance practical and everyday.

App navigation you can suggest:
- Forecast page (/forecast): shows next month's predicted income and expenses.
- Dashboard page (/dashboard): shows the current month, spending tracker, and tips.
- Profile page (/profile): lets the user update personal info and settings.

Response rules:
- Keep replies SHORT — 2 to 4 sentences maximum. Be conversational.
- If the user's question would be best answered by navigating to a page, end your reply with a JSON block on its own line, exactly like this: {"action": "navigate", "to": "/forecast"}
- Do not include the JSON block unless you are actually suggesting navigation.
- Never explain that you are an AI. Just be Mida.`;
};

// Calls the Gemini 2.0 Flash API and returns the text of the reply.
// "history" is the conversation so far (so Gemini has context).
const callGemini = async (
  userMessage: string,
  history: Array<{ role: "user" | "model"; parts: [{ text: string }] }>
): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Build the full list of turns: past history + the new user message
  const contents = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: buildSystemPrompt() }] },
    contents,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const json = await response.json();
  return json.candidates[0].content.parts[0].text as string;
};

// -----------------------------------

interface Message {
  role: "assistant" | "user";
  content: string;
  options?: string[];
  showDownload?: boolean;
  showUpload?: boolean;
  showDataTable?: boolean;
}

type OnboardingStep =
  | "greeting"
  | "name"
  | "age"
  | "goals"
  | "data-choice"
  | "manual-choice"
  | "manual-template"
  | "manual-chat"
  | "processing"
  | "done"
  | "returning";

// Generates and downloads a blank .xlsx template in the browser
// Column headers use real month labels e.g. "Mar/25" ... "Feb/26"
const downloadTemplate = () => {
  const rows   = ["Income", "Rent", "Groceries", "Transport", "Leisure", "Utilities", "Health", "Education", "Others"];
  const months = getMonthColumns(); // ["Mar/25", "Apr/25", ..., "Feb/26"]

  const headerRow = ["", ...months];
  const dataRows  = rows.map((row) => [row, ...months.map(() => "")]);
  const sheetData = [headerRow, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = [{ wch: 14 }, ...months.map(() => ({ wch: 10 }))];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Financial Data");
  XLSX.writeFile(wb, "Mida_Financial_Template.xlsx");
};

const Chat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<OnboardingStep>("greeting");
  const [userData, setUserData] = useState<Record<string, string>>({});
  const [showBankConnection, setShowBankConnection] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // isTyping: true while we wait for Gemini to reply (shows animated dots)
  const [isTyping, setIsTyping] = useState(false);

  // conversationHistory: the full list of turns sent to Gemini each time,
  // so it remembers what was said earlier in the session.
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "model"; parts: [{ text: string }] }>
  >([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "greeting") {
      const existing = loadUserData();
      setTimeout(() => {
        if (hasCompletedOnboarding()) {
          addAssistantMessage(
            `Welcome back, ${existing.name}! 👋 What would you like to do today?`,
            { options: ["View my forecast", "Track my spending", "Current month overview", "Update my info"] }
          );
          setStep("returning");
          setUserData(existing as Record<string, string>);
        } else {
          addAssistantMessage(
            "Welcome to Mida, your personal financial guide! 👋 I'll ask a few quick questions to help you forecast your future income and expenses. Let's start — what's your name?"
          );
          setStep("name");
        }
      }, 600);
    }
  }, []);

  const addAssistantMessage = (
    content: string,
    extra?: { options?: string[]; showDownload?: boolean; showUpload?: boolean; showDataTable?: boolean }
  ) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, options: extra?.options, showDownload: extra?.showDownload, showUpload: extra?.showUpload, showDataTable: extra?.showDataTable },
    ]);
  };

  const addUserMessage = (content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
  };

  const handleSend = (value?: string) => {
    const msg = value || input.trim();
    if (!msg) return;
    addUserMessage(msg);
    setInput("");
    processStep(msg);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addUserMessage(`📎 ${file.name}`);

    const result = await parseFinancialTemplate(file);
    if (!result.success) {
      setTimeout(() => {
        addAssistantMessage(
          `❌ ${result.error}\n\nPlease fix the issues and upload again.`,
          { showUpload: true }
        );
      }, 500);
    } else {
      const allData = { ...userData, dataMethod: "manual", financialData: result.data } as any;
      saveUserData(allData);
      clearForecastAdjustments(); // ← add this
      setStep("processing");
      setTimeout(() => {
        addAssistantMessage(
          "✅ Your financial data looks great! I have everything I need. Let me prepare your review..."
        );
        setTimeout(() => {
          navigate("/review", { state: { userData: allData, simulated: true } });
        }, 2000);
      }, 500);
    }
    e.target.value = "";
  };

  const handleDataTableComplete = (financialData: MonthlyData[]) => {
    const allData = { ...userData, dataMethod: "manual", financialData } as any;
    saveUserData(allData);
    clearForecastAdjustments(); // ← add this
    setStep("processing");
    addAssistantMessage(
      "✅ Your financial data looks great! I have everything I need. Let me prepare your review..."
    );
    setTimeout(() => {
      navigate("/review", { state: { userData: allData, simulated: true } });
    }, 2000);
  };

  const showManualDataFlow = () => {
    addAssistantMessage(
      "Download the template below, fill it with your financial data for the last 12 months, then upload it back.\n\n📋 **Instructions:**\n• Do not change the names of the columns and rows\n• Use only numbers to fill in your data",
      { showDownload: true, options: ["Enter data another way"] }
    );
    setStep("manual-template");
  };

  // Sends a message to Gemini and handles the response.
  // This is called only during the "returning" (post-onboarding) flow.
  const handleGeminiMessage = async (userMessage: string) => {
    // Show the animated typing indicator while we wait
    setIsTyping(true);

    try {
      const replyText = await callGemini(userMessage, conversationHistory);

      // Check if Gemini included a navigation instruction (JSON block)
      // e.g. {"action": "navigate", "to": "/forecast"}
      const jsonMatch = replyText.match(/\{"action"\s*:\s*"navigate"[^}]*\}/);

      // The visible reply is everything before the JSON block (if there is one)
      const visibleText = jsonMatch
        ? replyText.replace(jsonMatch[0], "").trim()
        : replyText.trim();

      // Update conversation history so the next call has full context
      setConversationHistory((prev) => [
        ...prev,
        { role: "user",  parts: [{ text: userMessage }] },
        { role: "model", parts: [{ text: replyText }] },
      ]);

      // If there is a visible reply, show it
      if (visibleText) {
        addAssistantMessage(visibleText);
      }

      // If Gemini told us to navigate, do so after a short pause
      if (jsonMatch) {
        try {
          const action = JSON.parse(jsonMatch[0]);
          if (action.action === "navigate" && action.to) {
            setTimeout(() => navigate(action.to), 1200);
          }
        } catch {
          // Ignore malformed JSON — just show the text reply
        }
      }
    } catch {
      // Show a friendly error if the API call failed
      addAssistantMessage(
        "Sorry, I'm having trouble connecting right now. Try again in a moment."
      );
    } finally {
      // Always hide the typing indicator when done
      setIsTyping(false);
    }
  };

  const processStep = (answer: string) => {
    const save = (key: string, val: string) =>
      setUserData((prev) => ({ ...prev, [key]: val }));

    setTimeout(() => {
      switch (step) {
        case "returning": {
          // Send the user's message to Gemini instead of keyword matching
          handleGeminiMessage(answer);
          break;
        }
        case "name":
          save("name", answer);
          addAssistantMessage(`Nice to meet you, ${answer}! How old are you?`);
          setStep("age");
          break;
        case "age":
          save("age", answer);
          addAssistantMessage("What are you most hoping to achieve with Mida?", {
            options: [
              "Build an emergency fund",
              "Make it through the month without stress",
              "Save for something specific",
              "Understand where my money is going",
              "Other",
            ],
          });
          setStep("goals");
          break;
        case "goals":
          save("goals", answer);
          addAssistantMessage(
            "Love that — I'll keep that in mind as we build your forecast. Now I need your financial data. How would you like to proceed?",
            { options: ["Connect my bank accounts", "Enter data manually"] }
          );
          setStep("data-choice");
          break;
        case "data-choice":
          if (answer.toLowerCase().includes("connect")) {
            setShowBankConnection(true);
          } else {
            save("dataMethod", "manual");
            addAssistantMessage(
              "How would you like to enter your data?",
              { options: ["Upload a spreadsheet", "Fill in the chat"] }
            );
            setStep("manual-choice");
          }
          break;
        case "manual-choice":
          if (answer.toLowerCase().includes("another way")) {
            addAssistantMessage(
              "No problem! How would you like to proceed?",
              { options: ["Connect my bank accounts", "Enter data manually"] }
            );
            setStep("data-choice");
          } else if (answer.toLowerCase().includes("spreadsheet") || answer.toLowerCase().includes("upload")) {
            showManualDataFlow();
          } else if (answer.toLowerCase().includes("chat") || answer.toLowerCase().includes("fill")) {
            addAssistantMessage(
              "Great! Use the table below to fill in your monthly financial data. Navigate between months and enter your income and expenses for each one.",
              { showDataTable: true, options: ["Enter data another way"] }
            );
            setStep("manual-chat");
          }
          break;
        case "manual-chat":
          if (answer.toLowerCase().includes("another way")) {
            addAssistantMessage(
              "No problem! How would you like to proceed?",
              { options: ["Connect my bank accounts", "Enter data manually"] }
            );
            setStep("data-choice");
          }
          break;
        case "manual-template":
          if (answer.toLowerCase().includes("another way")) {
            addAssistantMessage(
              "No problem! How would you like to proceed?",
              { options: ["Connect my bank accounts", "Enter data manually"] }
            );
            setStep("data-choice");
          } else {
            addAssistantMessage(
              "Please upload your filled template using the button below. Make sure all cells contain numbers only.",
              { showUpload: true, options: ["Enter data another way"] }
            );
          }
          break;
        default:
          break;
      }
    }, 500);
  };

  if (showBankConnection) {
    return <BankConnectionScreen userData={userData} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <img src={MidaLogo} alt="Mida" className="h-8 w-auto" />
        <div>
          <p className="text-sm font-semibold text-foreground">Mida Assistant</p>
          <p className="text-xs text-muted-foreground">
            {step === "returning" ? "Your financial guide" : "Personalizing your forecast"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="animate-slide-up">
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "assistant"
                  ? "bg-card shadow-card text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground ml-auto rounded-tr-sm"
              }`}
            >
              {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, idx) => {
                const boldMatch = part.match(/^\*\*(.+)\*\*$/);
                if (boldMatch) return <strong key={idx}>{boldMatch[1]}</strong>;
                return <span key={idx}>{part}</span>;
              })}
            </div>
            {msg.options && (
              <div className="flex flex-wrap gap-2 mt-2">
                {msg.options.map((opt) => (
                  <Button
                    key={opt}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(opt)}
                    disabled={i !== messages.length - 1}
                    className="rounded-full text-xs"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            )}
            {msg.showDownload && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs gap-1.5"
                  onClick={downloadTemplate}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Filled Template
                </Button>
              </div>
            )}
            {msg.showUpload && !msg.showDownload && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Filled Template
                </Button>
              </div>
            )}
            {msg.showDataTable && i === messages.length - 1 && (
              <div className="mt-3">
                <ChatDataTable onComplete={handleDataTableComplete} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator — three animated dots shown while Gemini is thinking */}
        {isTyping && (
          <div className="animate-slide-up">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-card shadow-card text-foreground rounded-tl-sm inline-flex gap-1 items-center">
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 mb-14">
        <div className="flex gap-2 max-w-lg mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && handleSend()}
            placeholder={
              step === "returning"
                ? isTyping ? "Mida is thinking..." : "Ask Mida anything..."
                : messages.length > 0 && messages[messages.length - 1].options
                ? "Select an option above"
                : "Type your answer..."
            }
            // Returning users can always type freely.
            // During onboarding, disable the input when option buttons are shown.
            disabled={
              isTyping ||
              (step !== "returning" && !!(messages.length > 0 && messages[messages.length - 1].options))
            }
            className="flex-1 rounded-full bg-secondary border-0"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="rounded-full shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;