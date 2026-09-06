// src/components/pos/LastSaleItemsTable.tsx
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
  type VisibilityState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Filter,
  X,
  Receipt,
  Package,
  Weight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export interface LastSaleItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  saleNumber: string;
  total: number;
  discount: number;
  items: LastSaleItem[];
}

export function LastSaleItemsTable({ saleNumber, total, discount, items }: Props) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const columns = useMemo<ColumnDef<LastSaleItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("lastSaleTable.product"),
        cell: ({ getValue }) => (
          <span className="font-bold text-[var(--text-primary)]">{getValue() as string}</span>
        ),
        filterFn: "includesString",
      },
      {
        accessorKey: "quantity",
        header: t("lastSaleTable.quantity"),
        cell: ({ getValue }) => (
          <span className="inline-flex rounded-md bg-[var(--color-primary-50)] px-2.5 py-1 text-xs font-black text-[var(--color-primary-700)]">
            {getValue() as number}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        accessorKey: "unitPrice",
        header: t("lastSaleTable.unitPrice"),
        cell: ({ getValue }) => (
          <span className="tabular-nums font-semibold text-[var(--text-secondary)]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "lineTotal",
        header: t("lastSaleTable.total"),
        accessorFn: (row) => row.unitPrice * row.quantity,
        cell: ({ getValue }) => (
          <span className="tabular-nums font-black text-[var(--color-primary-700)]">
            {(getValue() as number).toFixed(2)}
          </span>
        ),
        sortingFn: "basic",
      },
    ],
    [t]
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-light)] bg-gradient-to-r from-[var(--color-success-50)] to-[var(--bg-hover)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-success-500)] to-[var(--color-success-700)] text-white shadow-md">
            <Receipt className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              {t("lastSaleTable.invoiceDetails")} #{saleNumber}
            </h4>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>{t("lastSaleTable.totalLabel")} <strong className="text-[var(--color-success-700)]">{total.toFixed(2)}</strong></span>
              {discount > 0 && <span>{t("lastSaleTable.discountLabel")} <strong>{discount.toFixed(2)}</strong></span>}
              <span>{items.length} {t("lastSaleTable.itemsCount")}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            isVisible
              ? "bg-[var(--bg-card)] text-[var(--color-primary-700)] shadow-sm border border-[var(--border-light)]"
              : "bg-[var(--bg-hover)] text-[var(--text-muted)] border border-transparent"
          }`}
        >
          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {isVisible ? t("lastSaleTable.hideTable") : t("lastSaleTable.showTable")}
        </button>
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-light)] px-4 py-2">
              <button
                onClick={() => setShowFilters((s) => !s)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  showFilters
                    ? "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]"
                    : "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                }`}
              >
                <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                {t("lastSaleTable.filter")}
              </button>

              <div className="flex flex-wrap gap-1">
                {table.getAllLeafColumns().map((column) => {
                  if (column.id === "actions") return null;
                  const isVisible = column.getIsVisible();
                  return (
                    <button
                      key={column.id}
                      onClick={() => column.toggleVisibility()}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                        isVisible
                          ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)]"
                          : "bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-light)] line-through opacity-60"
                      }`}
                    >
                      {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex flex-wrap gap-3 overflow-hidden border-b border-[var(--border-light)] bg-[var(--bg-hover)] px-4 py-3"
                >
                  {table.getHeaderGroups()[0].headers.map((header) => {
                    if (!header.column.getCanFilter()) return null;
                    return (
                      <div key={header.id} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[var(--text-muted)]">
                          {typeof header.column.columnDef.header === "string"
                            ? header.column.columnDef.header
                            : header.column.id}
                        </label>
                        <input
                          type="text"
                          value={(header.column.getFilterValue() as string) ?? ""}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          placeholder={t("lastSaleTable.searchPlaceholder")}
                          className="w-32 rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary-400)]"
                        />
                      </div>
                    );
                  })}
                  <button
                    onClick={() => table.resetColumnFilters()}
                    className="self-end rounded-md bg-[var(--color-danger-50)] px-2 py-1 text-[10px] font-bold text-[var(--color-danger-600)] hover:bg-[var(--color-danger-100)]"
                  >
                    {t("lastSaleTable.clear")}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-[var(--border-light)] bg-[var(--bg-hover)]">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center justify-center gap-1 ${
                                header.column.getCanSort() ? "cursor-pointer select-none hover:text-[var(--text-primary)]" : ""
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <span className="text-[var(--text-muted)]">
                                  {{
                                    asc: <ArrowUp className="h-3 w-3" />,
                                    desc: <ArrowDown className="h-3 w-3" />,
                                  }[header.column.getIsSorted() as string] ?? (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border-light)] transition-colors hover:bg-[var(--bg-hover)] last:border-0"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-center">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.getRowModel().rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-[var(--text-muted)]">
                <X className="h-6 w-6 opacity-30" strokeWidth={1.5} />
                <p className="mt-1 text-xs">{t("lastSaleTable.noResults")}</p>
              </div>
            )}

            {/* Footer Summary */}
            <div className="flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-hover)] px-4 py-2.5 text-xs">
              <span className="text-[var(--text-muted)]">
                {t("lastSaleTable.subtotal")} <strong className="text-[var(--text-primary)]">{subtotal.toFixed(2)}</strong>
              </span>
              {discount > 0 && (
                <span className="text-[var(--text-muted)]">
                  {t("lastSaleTable.discountLabel")} <strong className="text-[var(--color-danger-600)]">{discount.toFixed(2)}</strong>
                </span>
              )}
              <span className="text-sm font-black text-[var(--color-primary-700)]">
                {t("lastSaleTable.totalLabel")} {total.toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}