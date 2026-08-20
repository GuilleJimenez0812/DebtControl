import re

with open("frontend/src/App.tsx", "r") as f:
    content = f.read()

if "import { CatExpensesPage }" not in content:
    content = content.replace(
        "import { Sidebar, type NavKey } from './components/layout/Sidebar';",
        "import { Sidebar, type NavKey } from './components/layout/Sidebar';\nimport { CatExpensesPage } from './components/CatExpensesPage';"
    )

content = content.replace(
    "{!user ? (\n            <AuthWall language={language} onOpenAuthModal={() => setIsAuthOpen(true)} />\n          ) : (\n            <>\n",
    "{!user ? (\n            <AuthWall language={language} onOpenAuthModal={() => setIsAuthOpen(true)} />\n          ) : (\n            <>\n              {activeTab === 'cats' ? (\n                <CatExpensesPage user={user} language={language} />\n              ) : (\n                <>\n"
)

content = content.replace(
    "            </>\n          )}\n      </main>",
    "                </>\n              )}\n            </>\n          )}\n      </main>"
)

with open("frontend/src/App.tsx", "w") as f:
    f.write(content)
