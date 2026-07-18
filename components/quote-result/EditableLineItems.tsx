"use client";

import { formatCurrency } from "@/lib/quote/format";
import {
  createEmptyLineItem,
  type QuoteLineItem,
} from "@/lib/quote/types";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

const CATEGORIES = ["Labor", "Materials", "Equipment", "Permit", "Other"];

interface EditableLineItemsProps {
  lineItems: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
}

export function EditableLineItems({
  lineItems,
  onChange,
}: EditableLineItemsProps) {
  const updateItem = (id: string, updates: Partial<QuoteLineItem>) => {
    onChange(
      lineItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeItem = (id: string) => {
    if (lineItems.length <= 1) return;
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const addItem = () => {
    onChange([...lineItems, createEmptyLineItem()]);
  };

  return (
    <div className="space-y-4">
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium text-slate-600">Item</th>
              <th className="w-20 px-3 py-3 font-medium text-slate-600">Qty</th>
              <th className="w-24 px-3 py-3 font-medium text-slate-600">Unit</th>
              <th className="w-28 px-3 py-3 text-right font-medium text-slate-600">Low</th>
              <th className="w-32 px-3 py-3 text-right font-medium text-mercurius-700">Recommended</th>
              <th className="w-28 px-3 py-3 text-right font-medium text-slate-600">High</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lineItems.map((item) => (
              <tr key={item.id} className="group transition-colors hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <select
                    value={item.category}
                    onChange={(e) =>
                      updateItem(item.id, { category: e.target.value })
                    }
                    className={`${inputClass} mb-1.5 w-auto text-xs`}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    placeholder="Line item description"
                    className={inputClass}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                    className={`${inputClass} text-center`}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.id, { unit: e.target.value })
                    }
                    className={inputClass}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={item.priceLow}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceLow: Number(e.target.value) || 0,
                      })
                    }
                    className={`${inputClass} text-right text-slate-500`}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={item.priceRecommended}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceRecommended: Number(e.target.value) || 0,
                      })
                    }
                    className={`${inputClass} text-right font-semibold text-mercurius-700`}
                  />
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={item.priceHigh}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceHigh: Number(e.target.value) || 0,
                      })
                    }
                    className={`${inputClass} text-right text-slate-500`}
                  />
                </td>
                <td className="px-2 py-3">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={lineItems.length <= 1}
                    className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-0"
                    aria-label="Remove line item"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {lineItems.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Item {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={lineItems.length <= 1}
                className="text-xs text-red-500 disabled:opacity-30"
              >
                Remove
              </button>
            </div>
            <div className="space-y-3">
              <select
                value={item.category}
                onChange={(e) =>
                  updateItem(item.id, { category: e.target.value })
                }
                className={inputClass}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={item.description}
                onChange={(e) =>
                  updateItem(item.id, { description: e.target.value })
                }
                placeholder="Description"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.id, { unit: e.target.value })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Low</label>
                  <input
                    type="number"
                    min={0}
                    value={item.priceLow}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceLow: Number(e.target.value) || 0,
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-mercurius-600">Rec.</label>
                  <input
                    type="number"
                    min={0}
                    value={item.priceRecommended}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceRecommended: Number(e.target.value) || 0,
                      })
                    }
                    className={`${inputClass} font-semibold`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">High</label>
                  <input
                    type="number"
                    min={0}
                    value={item.priceHigh}
                    onChange={(e) =>
                      updateItem(item.id, {
                        priceHigh: Number(e.target.value) || 0,
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-mercurius-400 hover:bg-mercurius-50 hover:text-mercurius-700"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
        </svg>
        Add line item
      </button>

      <p className="text-xs text-slate-400">
        Click any field to customize. Totals update automatically.
        Recommended column: {formatCurrency(lineItems.reduce((s, i) => s + i.priceRecommended, 0))}
      </p>
    </div>
  );
}