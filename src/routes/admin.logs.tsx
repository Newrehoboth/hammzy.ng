import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Package, X, Plus, Link as LinkIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceLogo } from "@/components/service-logo";
import { LOG_PLATFORMS, platformHasFollowers } from "@/lib/log-platforms";
import {
  adminListLogProducts,
  adminCreateLogProduct,
  adminUpdateLogProduct,
  adminDeleteLogProduct,
  adminGetLogProductItems,
} from "@/lib/logs.functions";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

type FormState = {
  id?: string;
  platform: string;
  customPlatform: string;
  subcategory: string;
  type: string;
  accountName: string;
  followers: string;
  price: string;
  description: string;
  bulkLogs: string;
  previewLinks: string[];
};

const emptyForm: FormState = {
  platform: "",
  customPlatform: "",
  subcategory: "",
  type: "",
  accountName: "",
  followers: "",
  price: "",
  description: "",
  bulkLogs: "",
  previewLinks: [],
};

function AdminLogs() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListLogProducts);
  const createFn = useServerFn(adminCreateLogProduct);
  const updateFn = useServerFn(adminUpdateLogProduct);
  const deleteFn = useServerFn(adminDeleteLogProduct);
  const getItemsFn = useServerFn(adminGetLogProductItems);

  const products = useQuery({ queryKey: ["admin-log-products"], queryFn: () => listFn() });
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLinkInput, setNewLinkInput] = useState("");

  const isOther = form.platform === "Other Platforms";
  const effectivePlatform = isOther ? form.customPlatform.trim() : form.platform;
  const showFollowers = effectivePlatform && platformHasFollowers(effectivePlatform);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const resetForm = () => {
    setForm(emptyForm);
    setNewLinkInput("");
    setEditing(false);
  };

  const addPreviewLink = () => {
    const url = newLinkInput.trim();
    if (!url) return;
    try {
      new URL(url); // validate it's a proper URL
    } catch {
      toast.error("Please enter a valid URL (starting with https://)");
      return;
    }
    if (form.previewLinks.length >= 10) {
      toast.error("Maximum 10 preview links allowed");
      return;
    }
    if (form.previewLinks.includes(url)) {
      toast.error("This link is already added");
      return;
    }
    set({ previewLinks: [...form.previewLinks, url] });
    setNewLinkInput("");
  };

  const removePreviewLink = (idx: number) => {
    set({ previewLinks: form.previewLinks.filter((_, i) => i !== idx) });
  };

  const startEdit = async (p: any) => {
    const known = LOG_PLATFORMS.includes(p.platform);
    const toastId = toast.loading("Loading log credentials...");
    try {
      const items = await getItemsFn({ data: { productId: p.id } });
      setForm({
        id: p.id,
        platform: known ? p.platform : "Other Platforms",
        customPlatform: known ? "" : p.platform,
        subcategory: p.subcategory || "",
        type: p.type,
        accountName: p.account_name || "",
        followers: p.followers || "",
        price: String(p.price),
        description: p.description || "",
        bulkLogs: items.join("\n"),
        previewLinks: p.preview_links ?? [],
      });
      setNewLinkInput("");
      setEditing(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.dismiss(toastId);
    } catch (e) {
      toast.error("Failed to load logs", { id: toastId });
    }
  };

  const onSubmit = async () => {
    if (!effectivePlatform) return toast.error("Select a platform");
    if (!form.type.trim()) return toast.error("Enter a type (the log title)");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return toast.error("Enter a valid price");
    if (!editing && form.bulkLogs.trim().length === 0) return toast.error("Add at least one log");

    setSaving(true);
    try {
      const payload = {
        platform: effectivePlatform,
        subcategory: form.subcategory.trim() || null,
        type: form.type.trim(),
        accountName: form.accountName.trim() || null,
        followers: showFollowers ? form.followers.trim() || null : null,
        price,
        description: form.description.trim() || null,
        previewLinks: form.previewLinks,
      };
      if (editing && form.id) {
        await updateFn({ data: { ...payload, id: form.id, bulkLogs: form.bulkLogs } });
        toast.success("Log updated successfully");
      } else {
        const res = await createFn({ data: { ...payload, bulkLogs: form.bulkLogs } });
        toast.success(`Log posted with ${res.added} item(s)`);
      }
      resetForm();
      qc.invalidateQueries({ queryKey: ["admin-log-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this log and all its items permanently?")) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Log deleted");
      qc.invalidateQueries({ queryKey: ["admin-log-products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Upload / edit form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold">{editing ? "Edit Log" : "Upload New Log"}</h1>
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="size-4" /> Cancel edit
            </Button>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Select Platform</Label>
            <Select value={form.platform} onValueChange={(v) => set({ platform: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose platform" />
              </SelectTrigger>
              <SelectContent>
                {LOG_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isOther && (
              <Input
                className="mt-2"
                placeholder="Enter platform name"
                value={form.customPlatform}
                onChange={(e) => set({ customPlatform: e.target.value })}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Account Name (optional)</Label>
            <Input placeholder="@username" value={form.accountName} onChange={(e) => set({ accountName: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Subcategory (optional)</Label>
            <Input
              placeholder="e.g. Instagram Boosted Accounts"
              value={form.subcategory}
              onChange={(e) => set({ subcategory: e.target.value })}
            />
          </div>

          {showFollowers && (
            <div className="space-y-1.5">
              <Label>Followers (optional)</Label>
              <Input placeholder="e.g. 0-10, 100+" value={form.followers} onChange={(e) => set({ followers: e.target.value })} />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Type (the log title shown to users)</Label>
            <Input
              placeholder="e.g. Old Instagram Accounts | 0-10 followers | Full 2FA"
              value={form.type}
              onChange={(e) => set({ type: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Price (₦)</Label>
            <Input type="number" step="1" min="0" placeholder="e.g. 2000" value={form.price} onChange={(e) => set({ price: e.target.value })} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>{editing ? "Edit Raw Logs (Unsold)" : "Bulk Logs (Required)"}</Label>
            <Textarea
              rows={5}
              placeholder={"username: olaowe password: ehdydf\nusername: test password: abcd1234"}
              value={form.bulkLogs}
              onChange={(e) => set({ bulkLogs: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {editing
                ? "Each line is one log. Modifying this list will overwrite the unsold logs for this product (sold logs are preserved)."
                : "One line = one log."}
            </p>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description (optional)</Label>
            <Textarea
              rows={3}
              placeholder="Describe the logs, account quality, or any special features…"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </div>

          {/* Preview Links Section */}
          <div className="space-y-3 sm:col-span-2">
            <div>
              <Label className="flex items-center gap-2">
                <LinkIcon className="size-3.5 text-muted-foreground" />
                Preview Links
                <span className="text-xs font-normal text-muted-foreground">(optional — up to 10 links users can click before buying)</span>
              </Label>
            </div>

            {/* Existing links */}
            {form.previewLinks.length > 0 && (
              <div className="space-y-2">
                {form.previewLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                  >
                    <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-primary hover:underline"
                    >
                      {link}
                    </a>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      title="Open link"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removePreviewLink(idx)}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove link"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new link input */}
            {form.previewLinks.length < 10 && (
              <div className="flex gap-2">
                <Input
                  placeholder="https://drive.google.com/… or any preview URL"
                  value={newLinkInput}
                  onChange={(e) => setNewLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPreviewLink();
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addPreviewLink} className="shrink-0 gap-1.5">
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
            )}
            {form.previewLinks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Paste a link (e.g. Google Drive image/video, screenshot, demo) and press Add or Enter. Users will see these before purchasing.
              </p>
            )}
          </div>
        </div>

        <Button variant="hero" className="mt-5" disabled={saving} onClick={onSubmit}>
          {saving ? "Saving…" : editing ? "Save changes" : "Upload Log"}
        </Button>
      </div>

      {/* Existing logs */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Uploaded Logs</h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-4 font-medium">Log</th>
                  <th className="p-4 font-medium">Platform</th>
                  <th className="p-4 font-medium">Subcategory</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Stock</th>
                  <th className="p-4 font-medium">Previews</th>
                  <th className="p-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(products.data ?? []).map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ServiceLogo name={p.platform} size="sm" />
                        <span className="font-medium">{p.type}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{p.platform}</td>
                    <td className="p-4 text-muted-foreground">{p.subcategory || "—"}</td>
                    <td className="p-4">₦{Number(p.price).toFixed(2)}</td>
                    <td className="p-4">
                      <Badge variant={p.stock > 0 ? "secondary" : "destructive"}>{p.stock} in stock</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">{p.sold} sold</span>
                    </td>
                    <td className="p-4">
                      {(p.preview_links ?? []).length > 0 ? (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="size-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">{p.preview_links.length}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                          <Pencil className="size-4" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(p.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.data && products.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 size-6" />
                      No logs uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}