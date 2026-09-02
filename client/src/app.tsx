import { FormEvent, useEffect, useState } from "react";
import {
  Boxes,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Plus,
  Search,
  Users,
  Warehouse,
} from "lucide-react";
import { api, Challan, Customer, Product, User } from "./api";

type View = "dashboard" | "customers" | "products" | "challans";
const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";
const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

function Modal({
  children,
  close,
}: {
  children: React.ReactNode;
  close: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/30 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section className="w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        {children}
        <button
          onClick={close}
          className="mt-5 text-sm font-semibold text-stone-500"
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    LEAD: "bg-amber-50 text-amber-700",
    INACTIVE: "bg-stone-100 text-stone-600",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    DRAFT: "bg-sky-50 text-sky-700",
    CANCELLED: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[value] || "bg-stone-100 text-stone-600"}`}
    >
      {value}
    </span>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("blaze_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [view, setView] = useState<View>("dashboard");
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [modal, setModal] = useState<
    "customer" | "product" | "challan" | "detail" | null
  >(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const load = async () => {
    try {
      setError("");
      const [d, c, p, ch] = await Promise.all([
        api<any>("/dashboard"),
        api<any>("/customers?limit=100"),
        api<any>("/products?limit=100"),
        api<any>("/challans?limit=100"),
      ]);
      setDashboard(d);
      setCustomers(c.data);
      setProducts(p.data);
      setChallans(ch.data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load operations data.",
      );
    }
  };
  useEffect(() => {
    if (user) void load();
  }, [user]);
  const logout = () => {
    localStorage.removeItem("blaze_token");
    localStorage.removeItem("blaze_user");
    setUser(null);
  };
  if (!user) return <Login onSuccess={setUser} />;
  const canManageCustomers = ["ADMIN", "SALES"].includes(user.role),
    canManageStock = ["ADMIN", "WAREHOUSE"].includes(user.role),
    canCreateChallan = ["ADMIN", "SALES"].includes(user.role);
  const nav = [
    { key: "dashboard", label: "Overview", icon: LayoutDashboard },
    { key: "customers", label: "Customers", icon: Users },
    { key: "products", label: "Inventory", icon: Boxes },
    { key: "challans", label: "Sales challans", icon: ClipboardList },
  ] as const;
  return (
    <main className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-stone-200 bg-white px-2 md:inset-y-0 md:left-0 md:right-auto md:h-screen md:w-64 md:flex-col md:items-stretch md:justify-start md:border-r md:border-t-0 md:px-4 md:py-7">
        <div className="hidden items-center gap-3 px-3 md:flex">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-pine font-display font-bold text-lime">
            B
          </div>
          <div>
            <p className="font-display font-bold">blaze.</p>
            <p className="text-xs text-stone-500">Operations portal</p>
          </div>
        </div>
        <nav className="flex w-full justify-around gap-1 md:mt-12 md:flex-col">
          {nav.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${view === key ? "bg-pine text-white" : "text-stone-500 hover:bg-stone-100"}`}
            >
              <Icon size={18} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </nav>
        <div className="hidden border-t border-stone-200 pt-4 md:mt-auto md:block">
          <div className="flex items-center gap-3 px-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-lime font-bold">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-xs text-stone-500">
                {user.role.toLowerCase()}
              </p>
            </div>
            <button onClick={logout} title="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <section className="mx-auto max-w-7xl px-5 pb-24 pt-8 md:ml-64 md:px-10 md:pb-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-pine">
              Monday, 1 September
            </p>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              {view === "dashboard"
                ? "Good morning, " + user.name.split(" ")[0]
                : view === "challans"
                  ? "Sales challans"
                  : view[0].toUpperCase() + view.slice(1)}
            </h1>
          </div>
          {view === "customers" && canManageCustomers && (
            <Action label="New customer" onClick={() => setModal("customer")} />
          )}
          {view === "products" && canManageStock && (
            <Action label="Add product" onClick={() => setModal("product")} />
          )}
          {view === "challans" && canCreateChallan && (
            <Action
              label="Create challan"
              onClick={() => setModal("challan")}
            />
          )}
        </header>
        {error && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {view === "dashboard" && (
          <Dashboard data={dashboard} setView={setView} />
        )}{" "}
        {view === "customers" && (
          <Customers
            data={customers}
            open={async (id) => {
              setSelectedCustomer(await api(`/customers/${id}`));
              setModal("detail");
            }}
          />
        )}{" "}
        {view === "products" && <Products data={products} />}{" "}
        {view === "challans" && (
          <Challans
            data={challans}
            confirm={async (id) => {
              if (confirm("Confirm this challan and deduct stock?")) {
                await api(`/challans/${id}/confirm`, { method: "POST" });
                await load();
              }
            }}
          />
        )}{" "}
      </section>
      {modal === "customer" && (
        <CustomerForm
          close={() => setModal(null)}
          done={async () => {
            setModal(null);
            await load();
          }}
        />
      )}{" "}
      {modal === "product" && (
        <ProductForm
          close={() => setModal(null)}
          done={async () => {
            setModal(null);
            await load();
          }}
        />
      )}{" "}
      {modal === "challan" && (
        <ChallanForm
          customers={customers}
          products={products}
          close={() => setModal(null)}
          done={async () => {
            setModal(null);
            await load();
          }}
        />
      )}{" "}
      {modal === "detail" && selectedCustomer && (
        <CustomerDetail
          customer={selectedCustomer}
          close={() => setModal(null)}
          refresh={async () => {
            setSelectedCustomer(await api(`/customers/${selectedCustomer.id}`));
            await load();
          }}
        />
      )}
    </main>
  );
}
function Login({ onSuccess }: { onSuccess: (u: User) => void }) {
  const [email, setEmail] = useState("admin@blaze.local"),
    [password, setPassword] = useState("Blaze@123"),
    [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const data = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("blaze_token", data.token);
      localStorage.setItem("blaze_user", JSON.stringify(data.user));
      onSuccess(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };
  return (
    <main className="grid min-h-screen bg-paper md:grid-cols-2">
      <section className="hidden bg-pine p-12 text-white md:flex md:flex-col">
        <div className="font-display text-2xl font-bold">blaze.</div>
        <div className="my-auto">
          <p className="mb-5 text-sm font-bold uppercase tracking-[.25em] text-lime">
            Keep operations moving
          </p>
          <h1 className="max-w-md font-display text-5xl font-bold leading-tight">
            A calmer way to run the everyday.
          </h1>
          <p className="mt-6 max-w-md text-lg text-emerald-100">
            Customers, stock and dispatch in one deliberate workspace.
          </p>
        </div>
      </section>
      <section className="m-auto w-full max-w-md p-7">
        <div className="mb-10 md:hidden">
          <p className="font-display text-2xl font-bold">blaze.</p>
          <p className="text-sm text-stone-500">Operations portal</p>
        </div>
        <p className="text-sm font-bold text-pine">WELCOME BACK</p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Sign in to your workspace
        </h1>
        <form className="mt-8 space-y-5" onSubmit={submit}>
          <label>
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="w-full rounded-xl bg-pine px-4 py-3 font-bold text-white hover:bg-green-800">
            Sign in <ChevronRight className="inline" size={17} />
          </button>
        </form>
        <p className="mt-6 text-sm text-stone-500">
          Demo credentials are prefilled. All roles use <b>Blaze@123</b>.
        </p>
      </section>
    </main>
  );
}
function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-pine px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-800"
    >
      <Plus className="mr-1 inline" size={17} />
      {label}
    </button>
  );
}
function Dashboard({
  data,
  setView,
}: {
  data: any;
  setView: (v: View) => void;
}) {
  if (!data) return <Loading />;
  const cards = [
    [
      "Customers",
      data.metrics.customerCount,
      "Active relationships",
      "customers",
    ],
    ["Products", data.metrics.productCount, "Across all locations", "products"],
    [
      "Low stock",
      data.metrics.lowStockCount,
      "Needs a closer look",
      "products",
    ],
    ["Challans", data.metrics.challanCount, "All-time dispatches", "challans"],
  ] as const;
  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note, key]) => (
          <button
            key={label}
            onClick={() => setView(key)}
            className="rounded-2xl bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5"
          >
            <p className="text-sm font-semibold text-stone-500">{label}</p>
            <p className="mt-3 font-display text-3xl font-bold">{value}</p>
            <p className="mt-2 text-xs text-stone-400">{note}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <Panel
          title="Recent challans"
          action="View all"
          onAction={() => setView("challans")}
        >
          <div className="divide-y divide-stone-100">
            {data.recentChallans.map((c: any) => (
              <div
                className="flex items-center justify-between py-4"
                key={c.id}
              >
                <div>
                  <p className="font-bold">{c.challanNumber}</p>
                  <p className="text-sm text-stone-500">
                    {c.customer.name} · {date(c.createdAt)}
                  </p>
                </div>
                <Badge value={c.status} />
              </div>
            ))}
            {!data.recentChallans.length && <Empty text="No challans yet." />}
          </div>
        </Panel>
        <Panel
          title="Follow-ups"
          action="Customers"
          onAction={() => setView("customers")}
        >
          <div className="space-y-3">
            {data.followUps.map((c: any) => (
              <div key={c.id} className="rounded-xl bg-amber-50 p-3">
                <p className="font-bold">{c.name}</p>
                <p className="mt-1 text-sm text-amber-800">
                  Due {date(c.followUpDate)}
                </p>
              </div>
            ))}
            {!data.followUps.length && <Empty text="No upcoming follow-ups." />}
          </div>
        </Panel>
      </div>
      <Panel title="Stock that needs attention">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.lowStock.map((p: Product) => (
            <div
              className="rounded-xl border border-amber-100 bg-white p-4"
              key={p.id}
            >
              <p className="font-bold">{p.name}</p>
              <p className="mt-2 text-sm text-stone-500">
                {p.currentStock} in stock · Min {p.minimumStock}
              </p>
            </div>
          ))}
          {!data.lowStock.length && (
            <Empty text="Your stock levels look healthy." />
          )}
        </div>
      </Panel>
    </div>
  );
}
function Panel({
  title,
  children,
  action,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {action && (
          <button onClick={onAction} className="text-sm font-bold text-pine">
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-5 text-sm text-stone-400">{text}</p>;
}
function Loading() {
  return (
    <div className="grid h-64 place-items-center text-stone-500">
      Loading workspace...
    </div>
  );
}
function Customers({
  data,
  open,
}: {
  data: Customer[];
  open: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const result = data.filter((c) =>
    `${c.name} ${c.businessName} ${c.mobile}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <Panel title="Customer directory">
      <div className="mb-4 flex max-w-md items-center gap-2 rounded-xl bg-stone-100 px-3">
        <Search size={17} className="text-stone-400" />
        <input
          className="!border-0 !bg-transparent !px-0"
          placeholder="Search name, business, phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Business</th>
              <th>Status</th>
              <th>Next follow-up</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result.map((c) => (
              <tr key={c.id}>
                <td>
                  <button
                    className="font-bold text-pine"
                    onClick={() => open(c.id)}
                  >
                    {c.name}
                  </button>
                  <span className="block text-xs text-stone-500">
                    {c.mobile}
                  </span>
                </td>
                <td>
                  {c.businessName}
                  <span className="block text-xs text-stone-500">{c.type}</span>
                </td>
                <td>
                  <Badge value={c.status} />
                </td>
                <td>{date(c.followUpDate)}</td>
                <td>
                  <button onClick={() => open(c.id)}>
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function Products({ data }: { data: Product[] }) {
  return (
    <Panel title="Warehouse inventory">
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Location</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td className="font-bold">
                  {p.name}
                  <span className="block text-xs font-normal text-stone-500">
                    {p.category}
                  </span>
                </td>
                <td>{p.sku}</td>
                <td>{p.location}</td>
                <td>{money(p.unitPrice)}</td>
                <td>
                  <span
                    className={
                      p.currentStock <= p.minimumStock
                        ? "font-bold text-rose-600"
                        : "font-bold text-emerald-700"
                    }
                  >
                    {p.currentStock}{" "}
                    <span className="font-normal text-stone-400">
                      / min {p.minimumStock}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function Challans({
  data,
  confirm: confirmChallan,
}: {
  data: Challan[];
  confirm: (id: string) => void;
}) {
  return (
    <Panel title="Dispatch register">
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Challan</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Created</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td className="font-bold">{c.challanNumber}</td>
                <td>{c.customer.name}</td>
                <td>{c.totalQuantity} units</td>
                <td>{date(c.createdAt)}</td>
                <td>
                  <Badge value={c.status} />
                </td>
                <td>
                  {c.status === "DRAFT" && (
                    <button
                      className="rounded-lg bg-pine px-3 py-1.5 text-xs font-bold text-white"
                      onClick={() => confirmChallan(c.id)}
                    >
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function CustomerForm({
  close,
  done,
}: {
  close: () => void;
  done: () => void;
}) {
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: f.get("name"),
        mobile: f.get("mobile"),
        email: f.get("email"),
        businessName: f.get("businessName"),
        gstNumber: f.get("gstNumber"),
        type: f.get("type"),
        address: f.get("address"),
        status: f.get("status"),
        notes: f.get("notes"),
      }),
    });
    await done();
  };
  return (
    <Modal close={close}>
      <h2 className="font-display text-2xl font-bold">New customer</h2>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Mobile
          <input name="mobile" required />
        </label>
        <label>
          Business name
          <input name="businessName" required />
        </label>
        <label>
          Email
          <input name="email" type="email" />
        </label>
        <label>
          Customer type
          <select name="type">
            <option>RETAIL</option>
            <option>WHOLESALE</option>
            <option>DISTRIBUTOR</option>
          </select>
        </label>
        <label>
          Status
          <select name="status">
            <option>LEAD</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </select>
        </label>
        <label>
          GST number
          <input name="gstNumber" />
        </label>
        <label>
          Address
          <input name="address" required />
        </label>
        <label className="sm:col-span-2">
          Notes
          <textarea name="notes" rows={3} />
        </label>
        <button className="rounded-xl bg-pine px-4 py-3 font-bold text-white sm:col-span-2">
          Create customer
        </button>
      </form>
    </Modal>
  );
}
function ProductForm({ close, done }: { close: () => void; done: () => void }) {
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await api("/products", {
      method: "POST",
      body: JSON.stringify({
        name: f.get("name"),
        sku: f.get("sku"),
        category: f.get("category"),
        unitPrice: f.get("unitPrice"),
        currentStock: f.get("currentStock"),
        minimumStock: f.get("minimumStock"),
        location: f.get("location"),
      }),
    });
    await done();
  };
  return (
    <Modal close={close}>
      <h2 className="font-display text-2xl font-bold">Add product</h2>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label>
          Product name
          <input name="name" required />
        </label>
        <label>
          SKU / code
          <input name="sku" required />
        </label>
        <label>
          Category
          <input name="category" required />
        </label>
        <label>
          Unit price
          <input name="unitPrice" type="number" min="0" required />
        </label>
        <label>
          Opening stock
          <input name="currentStock" type="number" min="0" required />
        </label>
        <label>
          Minimum alert level
          <input name="minimumStock" type="number" min="0" required />
        </label>
        <label className="sm:col-span-2">
          Location / warehouse
          <input name="location" required />
        </label>
        <button className="rounded-xl bg-pine px-4 py-3 font-bold text-white sm:col-span-2">
          Add to inventory
        </button>
      </form>
    </Modal>
  );
}
function ChallanForm({
  customers,
  products,
  close,
  done,
}: {
  customers: Customer[];
  products: Product[];
  close: () => void;
  done: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [status, setStatus] = useState("DRAFT");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api("/challans", {
      method: "POST",
      body: JSON.stringify({ customerId, status, items }),
    });
    await done();
  };
  const update = (
    index: number,
    key: "productId" | "quantity",
    value: string,
  ) =>
    setItems(
      items.map((item, i) =>
        i === index
          ? { ...item, [key]: key === "quantity" ? Number(value) : value }
          : item,
      ),
    );
  return (
    <Modal close={close}>
      <h2 className="font-display text-2xl font-bold">Create sales challan</h2>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label>
          Customer
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option value={c.id} key={c.id}>
                {c.businessName} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm font-bold">Products</p>
          {items.map((item, i) => (
            <div className="grid grid-cols-[1fr_90px] gap-2" key={i}>
              <select
                value={item.productId}
                onChange={(e) => update(i, "productId", e.target.value)}
                required
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.currentStock} stock)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => update(i, "quantity", e.target.value)}
                required
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="text-sm font-bold text-pine"
          onClick={() => setItems([...items, { productId: "", quantity: 1 }])}
        >
          <PackagePlus className="mr-1 inline" size={16} />
          Add another product
        </button>
        <label>
          Save as
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed (deduct stock)</option>
          </select>
        </label>
        <button className="w-full rounded-xl bg-pine px-4 py-3 font-bold text-white">
          Create challan
        </button>
      </form>
    </Modal>
  );
}
function CustomerDetail({
  customer,
  close,
  refresh,
}: {
  customer: any;
  close: () => void;
  refresh: () => void;
}) {
  const [note, setNote] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await api(`/customers/${customer.id}/follow-ups`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
    setNote("");
    await refresh();
  };
  return (
    <Modal close={close}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-pine">{customer.businessName}</p>
          <h2 className="font-display text-2xl font-bold">{customer.name}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {customer.mobile} · {customer.email || "No email"}
          </p>
        </div>
        <Badge value={customer.status} />
      </div>
      <div className="mt-6 rounded-xl bg-stone-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
          Notes
        </p>
        <p className="mt-1 text-sm">{customer.notes || "No notes recorded."}</p>
      </div>
      <h3 className="mt-6 font-display font-bold">Follow-up history</h3>
      <div className="mt-2 max-h-36 space-y-2 overflow-y-auto">
        {customer.followUps.map((f: any) => (
          <div
            key={f.id}
            className="border-l-2 border-lime bg-stone-50 px-3 py-2 text-sm"
          >
            <p>{f.note}</p>
            <p className="mt-1 text-xs text-stone-500">
              {date(f.createdAt)}
              {f.dueDate ? ` · due ${date(f.dueDate)}` : ""}
            </p>
          </div>
        ))}
        {!customer.followUps.length && <Empty text="No follow-ups yet." />}
      </div>
      <form className="mt-5 flex gap-2" onSubmit={submit}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a follow-up note"
          required
        />
        <button className="rounded-xl bg-pine px-4 font-bold text-white">
          Add
        </button>
      </form>
    </Modal>
  );
}
