#!/bin/bash

# Ticket 1
T1=$(gh issue create --title "Update database schema for module-level access" --body "## Question

Update the users table/schema to support module-level access (Amazon, Cats) and sub-permissions (assigned persons for Amazon). How should the user struct and DB represent this?" --label "wayfinder:task")

# Ticket 2
T2=$(gh issue create --title "Create Exchange Rates service & BCV scraper" --body "## Question

Implement the BCV scraper service and the \`exchange_rates\` DB table to store manual or fetched rates (USD/EUR to VEF)." --label "wayfinder:task")

# Ticket 3
T3=$(gh issue create --title "Create database schema for Cat Expenses" --body "## Question

Create the \`cat_expenses\` table with platform, method, amount_usd, original_currency, exchange_rate, etc." --label "wayfinder:task")

# Ticket 4
T4=$(gh issue create --title "Build UI for Exchange Rates modal & Cat module tab" --body "## Question

Create the UI modal to fetch/update BCV rates, and the main Cat module tab to display the current registered rates and dates." --label "wayfinder:prototype")

# Ticket 5
T5=$(gh issue create --title "Build backend CRUD for Cat Expenses" --body "## Question

Implement the Hexagonal Architecture layers (handlers, services, repos) for Cat Expenses." --label "wayfinder:task")

# Ticket 6
T6=$(gh issue create --title "Build UI for Cat Expenses CRUD" --body "## Question

Create the UI for listing, creating, and editing Cat expenses." --label "wayfinder:prototype")

echo "$T1 $T2 $T3 $T4 $T5 $T6"
