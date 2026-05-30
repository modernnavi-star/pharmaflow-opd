import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import {
  Search,
  Pill,
  Plus,
  Minus,
  Save,
  AlertTriangle,
  CheckCircle2,
  Calendar as CalendarIcon,
  Package,
  TrendingDown,
  X,
  Loader2,
  Filter,
} from "lucide-react";
import { embeddedMedicines } from "@/data/medicines";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharmaStock — Daily Medicine Stock Entry" },
      {
        name: "description",
        content:
          "Daily pharmacy stock entry for Karnataka Essential Drug List. Search, update opening/received/dispensed/closing stock, and track low-stock medicines.",
      },
      { property: "og:title", content: "PharmaStock — Daily Medicine Stock Entry" },
      {
        property: "og:description",
        content:
          "Track daily stock for Karnataka EDL medicines with search, low-stock alerts and history.",
      },
    ],
  }),
  component: StockApp,
});

type Medicine = {
  id: string;
  name: string;
  generic_name: string | null;
  strength: string | null;
  form: string | null;
  category: string | null;
  unit: string;
  reorder_level: number;
  current_stock: number;
  updated_at: string;
};

type StockEntry = {
  id: string;
  medicine_id: string;
  entry_date: string;
  opening_stock: number;
  received: number;
  dispensed: number;
  closing_stock: number;
  notes: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const LOCAL_STOCK_KEY = "pharmastock-local-stocks";
const LOCAL_ENTRIES_KEY = "pharmastock-local-entries";

type PackType = "tablets" | "sheets" | "boxes";

type LocalStockMap = Record<string, number>;

type LocalReportEntry = {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name: string | null;
  category: string | null;
  entry_date: string;
  opening_stock: number;
  received: number;
  dispensed: number;
  closing_stock: number;
  batch_no: string | null;
  expiry_date: string | null;
  received_pack_type: PackType;
  received_pack_qty: number;
  issue_pack_type: PackType;
  issue_pack_qty: number;
  notes: string | null;
};

const getLocalStocks = (): LocalStockMap => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_STOCK_KEY) ?? "{}") as LocalStockMap;
  } catch {
    return {};
  }
};

const setLocalStock = (medicineId: string, stock: number) => {
  if (typeof window === "undefined") return;
  const localStocks = getLocalStocks();
  localStocks[medicineId] = stock;
  window.localStorage.setItem(LOCAL_STOCK_KEY, JSON.stringify(localStocks));
};

const getLocalEntries = (): LocalReportEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_ENTRIES_KEY) ?? "[]") as LocalReportEntry[];
  } catch {
    return [];
  }
};

const upsertLocalEntry = (entry: LocalReportEntry) => {
  if (typeof window === "undefined") return;
  const entries = getLocalEntries();
  const existingIndex = entries.findIndex((e) => e.id === entry.id);
  if (existingIndex >= 0) entries[existingIndex] = entry;
  else entries.push(entry);
  window.localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
};

const packToUnits = (packType: PackType, quantity: number, unitsPerPack: number) =>
  packType === "tablets" ? quantity : quantity * Math.max(1, unitsPerPack || 1);

const packLabel = (packType: PackType) => {
  if (packType === "boxes") return "boxes";
  if (packType === "sheets") return "sheets";
  return "tablets/units";
};

const getEmbeddedMedicines = (): Medicine[] => {
  const localStocks = getLocalStocks();
  return embeddedMedicines.map((m) => ({
    ...m,
    current_stock: localStocks[m.id] ?? m.current_stock,
  })) as Medicine[];
};

export function StockApp() {
  const [medicines, setMedicines] = useState<Medicine[]>(getEmbeddedMedicines);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [date, setDate] = useState(today());
  const [selected, setSelected] = useState<Medicine | null>(null);

  const loadMedicines = async () => {
    // Always show the embedded catalog first so the Android app works even
    // when Supabase env vars or network are unavailable.
    setMedicines(getEmbeddedMedicines());
    setLoading(false);

    try {
      const { data, error } = await supabase
        .from("medicines")
        .select("*")
        .order("name", { ascending: true })
        .limit(2000);
      if (!error && data?.length) setMedicines(data as Medicine[]);
    } catch (error) {
      console.info("Using embedded offline medicine catalog", error);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    medicines.forEach((m) => m.category && s.add(m.category));
    return Array.from(s).sort();
  }, [medicines]);

  const hasActiveSearch =
    search.trim().length >= 2 || categoryFilter !== "all" || stockFilter !== "all";

  const filtered = useMemo(() => {
    if (!hasActiveSearch) return [];
    const q = search.trim().toLowerCase();
    return medicines.filter((m) => {
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
      if (stockFilter === "low" && m.current_stock > m.reorder_level) return false;
      if (stockFilter === "out" && m.current_stock > 0) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.generic_name ?? "").toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q) ||
        (m.strength ?? "").toLowerCase().includes(q)
      );
    });
  }, [medicines, search, categoryFilter, stockFilter, hasActiveSearch]);

  const stats = useMemo(() => {
    const total = medicines.length;
    const low = medicines.filter(
      (m) => m.current_stock > 0 && m.current_stock <= m.reorder_level,
    ).length;
    const out = medicines.filter((m) => m.current_stock === 0).length;
    const totalUnits = medicines.reduce((s, m) => s + m.current_stock, 0);
    return { total, low, out, totalUnits };
  }, [medicines]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <Header date={date} setDate={setDate} />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:pt-8">
        <StatsRow stats={stats} />
        <ReportsSection date={date} medicines={medicines} />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, generic, strength, category…"
              className="h-11 pl-9 pr-9 text-base"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full sm:w-48">
                <Filter className="mr-1 size-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stockFilter}
              onValueChange={(v) => setStockFilter(v as typeof stockFilter)}
            >
              <SelectTrigger className="h-11 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 text-sm text-muted-foreground">
          {loading
            ? "Loading…"
            : hasActiveSearch
              ? `${filtered.length} of ${medicines.length} medicines`
              : "Search medicine name/generic, or choose a category to view drugs."}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> Loading medicines…
            </div>
          ) : !hasActiveSearch ? (
            <div className="col-span-full rounded-lg border border-dashed bg-card p-10 text-center text-muted-foreground">
              <Pill className="mx-auto mb-3 size-8 text-primary" />
              Type at least 2 letters (for example, “para”) or select a category to find drug
              details.
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              No medicines match your search/category.
            </div>
          ) : (
            filtered.map((m) => <MedicineRow key={m.id} m={m} onSelect={() => setSelected(m)} />)
          )}
        </div>
      </main>

      <EntryDialog
        medicine={selected}
        date={date}
        onClose={() => setSelected(null)}
        onSaved={() => {
          setSelected(null);
          loadMedicines();
        }}
      />
    </div>
  );
}

function ReportsSection({ date, medicines }: { date: string; medicines: Medicine[] }) {
  const [mode, setMode] = useState<"daily" | "monthly" | "yearly">("daily");
  const [entries, setEntries] = useState<LocalReportEntry[]>([]);

  useEffect(() => {
    setEntries(getLocalEntries());
  }, [date, medicines]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (mode === "daily") return entry.entry_date === date;
      if (mode === "monthly") return entry.entry_date.slice(0, 7) === date.slice(0, 7);
      return entry.entry_date.slice(0, 4) === date.slice(0, 4);
    });
  }, [date, entries, mode]);

  const report = useMemo(() => {
    const received = filteredEntries.reduce((sum, entry) => sum + entry.received, 0);
    const issued = filteredEntries.reduce((sum, entry) => sum + entry.dispensed, 0);
    const uniqueMedicines = new Set(filteredEntries.map((entry) => entry.medicine_id)).size;
    const expiringSoon = filteredEntries.filter((entry) => {
      if (!entry.expiry_date) return false;
      const days = (new Date(entry.expiry_date).getTime() - Date.now()) / 86400000;
      return days >= 0 && days <= 90;
    }).length;
    return { received, issued, uniqueMedicines, expiringSoon };
  }, [filteredEntries]);

  const title =
    mode === "daily"
      ? `Daily report · ${date}`
      : mode === "monthly"
        ? `Monthly report · ${date.slice(0, 7)}`
        : `Yearly report · ${date.slice(0, 4)}`;

  return (
    <Card className="mt-4 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Reports</div>
          <div className="text-xs text-muted-foreground">{title}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {(["daily", "monthly", "yearly"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={mode === item ? "default" : "ghost"}
              className="h-8 capitalize"
              onClick={() => setMode(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ReportStat label="Inward" value={report.received} />
        <ReportStat label="Issued" value={report.issued} />
        <ReportStat label="Drug items" value={report.uniqueMedicines} />
        <ReportStat label="Expiring ≤90d" value={report.expiringSoon} />
      </div>

      {filteredEntries.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Drug / batch</span>
            <span>In</span>
            <span>Issue</span>
          </div>
          {filteredEntries
            .slice(-6)
            .reverse()
            .map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-border px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{entry.medicine_name}</div>
                  <div className="truncate text-muted-foreground">
                    {entry.entry_date}
                    {entry.batch_no ? ` · Batch ${entry.batch_no}` : ""}
                    {entry.expiry_date ? ` · Exp ${entry.expiry_date}` : ""}
                  </div>
                </div>
                <span className="tabular-nums text-success">{entry.received}</span>
                <span className="tabular-nums text-destructive">{entry.dispensed}</span>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}

function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}

function Header({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Pill className="size-5" />
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">PharmaStock</div>
            <div className="text-xs text-muted-foreground leading-tight">
              Karnataka EDL · Daily Entry
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-md border border-input bg-card px-2.5 py-1.5 text-sm shadow-sm">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
          />
        </label>
      </div>
    </header>
  );
}

function StatsRow({
  stats,
}: {
  stats: { total: number; low: number; out: number; totalUnits: number };
}) {
  const items = [
    { label: "Medicines", value: stats.total, icon: Pill, tone: "primary" },
    { label: "Total units", value: stats.totalUnits, icon: Package, tone: "muted" },
    { label: "Low stock", value: stats.low, icon: TrendingDown, tone: "warning" },
    { label: "Out of stock", value: stats.out, icon: AlertTriangle, tone: "destructive" },
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {it.label}
            </span>
            <it.icon
              className={cn(
                "size-4",
                it.tone === "warning" && "text-warning",
                it.tone === "destructive" && "text-destructive",
                it.tone === "primary" && "text-primary",
                it.tone === "muted" && "text-muted-foreground",
              )}
            />
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {it.value.toLocaleString()}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MedicineRow({ m, onSelect }: { m: Medicine; onSelect: () => void }) {
  const isOut = m.current_stock === 0;
  const isLow = !isOut && m.current_stock <= m.reorder_level;
  return (
    <button
      onClick={onSelect}
      className="group flex w-full items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate font-medium">{m.name}</span>
          {m.strength && <span className="text-xs text-muted-foreground">{m.strength}</span>}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {m.generic_name ?? "—"} · {m.form ?? "—"} · {m.category ?? "—"}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-lg font-semibold tabular-nums leading-none">
          {m.current_stock}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{m.unit}</span>
        </div>
        {isOut ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" /> Out
          </Badge>
        ) : isLow ? (
          <Badge className="gap-1 bg-warning text-warning-foreground hover:bg-warning/90">
            <TrendingDown className="size-3" /> Low
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="size-3" /> OK
          </Badge>
        )}
      </div>
    </button>
  );
}

function EntryDialog({
  medicine,
  date,
  onClose,
  onSaved,
}: {
  medicine: Medicine | null;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [opening, setOpening] = useState(0);
  const [receivedPackType, setReceivedPackType] = useState<PackType>("tablets");
  const [receivedPackQty, setReceivedPackQty] = useState(0);
  const [receivedUnitsPerPack, setReceivedUnitsPerPack] = useState(10);
  const [issuePackType, setIssuePackType] = useState<PackType>("tablets");
  const [issuePackQty, setIssuePackQty] = useState(0);
  const [issueUnitsPerPack, setIssueUnitsPerPack] = useState(10);
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const received = packToUnits(receivedPackType, receivedPackQty, receivedUnitsPerPack);
  const dispensed = packToUnits(issuePackType, issuePackQty, issueUnitsPerPack);
  const closing = Math.max(0, opening + received - dispensed);

  const setReceivedUnits = (units: number) => {
    setReceivedPackType("tablets");
    setReceivedPackQty(units);
    setReceivedUnitsPerPack(10);
  };

  const setIssueUnits = (units: number) => {
    setIssuePackType("tablets");
    setIssuePackQty(units);
    setIssueUnitsPerPack(10);
  };

  useEffect(() => {
    if (!medicine) return;
    setSaving(false);
    setLoading(true);
    setNotes("");
    setBatchNo("");
    setExpiryDate("");
    setExistingId(null);
    (async () => {
      try {
        const { data: existing } = await supabase
          .from("stock_entries")
          .select("*")
          .eq("medicine_id", medicine.id)
          .eq("entry_date", date)
          .maybeSingle();

        if (existing) {
          const e = existing as StockEntry;
          setExistingId(e.id);
          setOpening(e.opening_stock);
          setReceivedUnits(e.received);
          setIssueUnits(e.dispensed);
          setNotes(e.notes ?? "");
        } else {
          const { data: prev } = await supabase
            .from("stock_entries")
            .select("closing_stock")
            .eq("medicine_id", medicine.id)
            .lt("entry_date", date)
            .order("entry_date", { ascending: false })
            .limit(1)
            .maybeSingle();
          setOpening(prev?.closing_stock ?? medicine.current_stock);
          setReceivedUnits(0);
          setIssueUnits(0);
        }
      } catch (error) {
        console.info("Using local stock entry mode", error);
        setOpening(medicine.current_stock);
        setReceivedUnits(0);
        setIssueUnits(0);
      }
      setLoading(false);
    })();
  }, [medicine, date]);

  if (!medicine) return null;

  const save = async () => {
    if (dispensed > opening + received) {
      toast.error("Dispensed cannot exceed opening + received.");
      return;
    }
    setSaving(true);
    const inwardDetails = [
      received > 0 && batchNo.trim() ? `Batch: ${batchNo.trim()}` : null,
      received > 0 && expiryDate ? `Expiry: ${expiryDate}` : null,
      received > 0
        ? `Inward: ${receivedPackQty} ${packLabel(receivedPackType)} = ${received} ${medicine.unit}`
        : null,
      dispensed > 0
        ? `Issue: ${issuePackQty} ${packLabel(issuePackType)} = ${dispensed} ${medicine.unit}`
        : null,
      notes.trim() || null,
    ].filter(Boolean);

    const payload = {
      medicine_id: medicine.id,
      entry_date: date,
      opening_stock: opening,
      received,
      dispensed,
      closing_stock: closing,
      notes: inwardDetails.join("\n") || null,
    };
    try {
      const res = existingId
        ? await supabase.from("stock_entries").update(payload).eq("id", existingId)
        : await supabase.from("stock_entries").insert(payload);
      if (res.error) throw res.error;
    } catch (error) {
      console.info("Saving stock locally because Supabase is unavailable", error);
    }
    setLocalStock(medicine.id, closing);
    upsertLocalEntry({
      id: `${medicine.id}-${date}`,
      medicine_id: medicine.id,
      medicine_name: medicine.name,
      generic_name: medicine.generic_name,
      category: medicine.category,
      entry_date: date,
      opening_stock: opening,
      received,
      dispensed,
      closing_stock: closing,
      batch_no: received > 0 ? batchNo.trim() || null : null,
      expiry_date: received > 0 ? expiryDate || null : null,
      received_pack_type: receivedPackType,
      received_pack_qty: receivedPackQty,
      issue_pack_type: issuePackType,
      issue_pack_qty: issuePackQty,
      notes: notes.trim() || null,
    });
    setSaving(false);
    toast.success(`Saved entry for ${medicine.name}`);
    onSaved();
  };

  return (
    <Dialog open={!!medicine} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="size-4 text-primary" />
            {medicine.name}
            {medicine.strength && (
              <span className="text-sm font-normal text-muted-foreground">{medicine.strength}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {medicine.generic_name ?? "—"} · {medicine.form ?? "—"} ·{" "}
            <span className="font-medium">Entry for {date}</span>
            {existingId && (
              <Badge variant="secondary" className="ml-2">
                Updating today's entry
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <NumberField
              label="Opening stock"
              value={opening}
              setValue={setOpening}
              unit={medicine.unit}
            />
            <PackQuantityField
              label="Inward / received stock"
              packType={receivedPackType}
              setPackType={setReceivedPackType}
              quantity={receivedPackQty}
              setQuantity={setReceivedPackQty}
              unitsPerPack={receivedUnitsPerPack}
              setUnitsPerPack={setReceivedUnitsPerPack}
              calculatedUnits={received}
              unit={medicine.unit}
              tone="success"
            />

            {received > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="batch-no">Batch no.</Label>
                  <Input
                    id="batch-no"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value.slice(0, 80))}
                    placeholder="e.g. B2026A"
                    className="mt-1 h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="expiry-date">Expiry date</Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="mt-1 h-10"
                  />
                </div>
              </div>
            )}

            <PackQuantityField
              label="Stock issue / dispensed"
              packType={issuePackType}
              setPackType={setIssuePackType}
              quantity={issuePackQty}
              setQuantity={setIssuePackQty}
              unitsPerPack={issueUnitsPerPack}
              setUnitsPerPack={setIssueUnitsPerPack}
              calculatedUnits={dispensed}
              unit={medicine.unit}
              tone="destructive"
            />

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Closing stock</span>
                <span className="text-xl font-semibold tabular-nums">
                  {closing}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {medicine.unit}
                  </span>
                </span>
              </div>
              {closing === 0 ? (
                <p className="mt-1 text-xs text-destructive">Will be marked Out of stock.</p>
              ) : closing <= medicine.reorder_level ? (
                <p className="mt-1 text-xs text-warning-foreground">
                  Below reorder level ({medicine.reorder_level}). Consider reordering.
                </p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                placeholder="Batch no., expiry, supplier…"
                className="mt-1 h-20"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-1 size-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-1 size-4" /> Save entry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PackQuantityField({
  label,
  packType,
  setPackType,
  quantity,
  setQuantity,
  unitsPerPack,
  setUnitsPerPack,
  calculatedUnits,
  unit,
  tone,
}: {
  label: string;
  packType: PackType;
  setPackType: (value: PackType) => void;
  quantity: number;
  setQuantity: (value: number) => void;
  unitsPerPack: number;
  setUnitsPerPack: (value: number) => void;
  calculatedUnits: number;
  unit: string;
  tone?: "success" | "destructive";
}) {
  const bump = (delta: number) => setQuantity(Math.max(0, quantity + delta));

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <Badge variant="secondary" className="tabular-nums">
          {calculatedUnits} {unit}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-[1fr_1.1fr] gap-2">
        <Select value={packType} onValueChange={(value) => setPackType(value as PackType)}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tablets">Tablets / units</SelectItem>
            <SelectItem value="sheets">Sheets</SelectItem>
            <SelectItem value="boxes">Boxes</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-stretch gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => bump(-1)}
          >
            <Minus className="size-4" />
          </Button>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
            className={cn(
              "h-10 text-center font-semibold tabular-nums",
              tone === "success" && "border-success/40",
              tone === "destructive" && "border-destructive/40",
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => bump(1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {packType !== "tablets" && (
        <div className="mt-2">
          <Label className="text-xs text-muted-foreground">
            {packType === "sheets" ? "Tablets/units per sheet" : "Tablets/units per box"}
          </Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={unitsPerPack}
            onChange={(e) => setUnitsPerPack(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 h-10 text-center font-semibold tabular-nums"
          />
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  setValue,
  unit,
  tone,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  unit: string;
  tone?: "success" | "destructive";
}) {
  const bump = (delta: number) => setValue(Math.max(0, value + delta));
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1 flex items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => bump(-1)}
        >
          <Minus className="size-4" />
        </Button>
        <div className="relative flex-1">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))}
            className={cn(
              "h-11 text-center text-lg font-semibold tabular-nums",
              tone === "success" && "border-success/40",
              tone === "destructive" && "border-destructive/40",
            )}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={() => bump(1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
