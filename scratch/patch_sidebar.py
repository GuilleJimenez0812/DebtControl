import re

with open("frontend/src/components/layout/Sidebar.tsx", "r") as f:
    content = f.read()

# Add Cat icon to lucide-react imports if not there
if "Cat," not in content:
    content = content.replace("import { Layers", "import { Cat, Layers")

# We will remove the const NAV and put it inside the component.
content = re.sub(
    r"const NAV: NavItem\[\] = \[.*?\];",
    """const BASE_NAV: NavItem[] = [
  { key: 'debts', icon: <Layers className="h-4 w-4" />, label: 'Debts', es: 'Deudas' },
  { key: 'purchases', icon: <ShoppingBag className="h-4 w-4" />, label: 'Purchases', es: 'Compras' },
  { key: 'payments', icon: <CreditCard className="h-4 w-4" />, label: 'Payments', es: 'Pagos' },
  { key: 'invoices', icon: <FileUp className="h-4 w-4" />, label: 'Invoices', es: 'Facturas' },
];""",
    content,
    flags=re.DOTALL
)

content = content.replace(
    "isAdmin,",
    "isAdmin,\n  userModules = [],"
)

content = content.replace(
    "{NAV.map((item) => (",
    """{[...BASE_NAV, ...(userModules?.includes('gatos') ? [{ key: 'cats' as NavKey, icon: <Cat className="h-4 w-4" />, label: 'Cats', es: 'Gatos' }] : [])].map((item) => ("""
)

with open("frontend/src/components/layout/Sidebar.tsx", "w") as f:
    f.write(content)
