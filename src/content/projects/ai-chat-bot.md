---
title: "SPSAeries PowerShell Module"
description: "A PowerShell module that extends and enhances the official Aeries SIS PowerShell module with additional functionality and improved workflows."
pubDate: 2024-06-15
tags: ["PowerShell", "Aeries", "automation", "K-12"]
category: "Development"
workPlayCategory: "Work"
---

Here's the problem: the Aeries API doesn't expose all data points. When I first started this project, the official [AeriesApi](https://github.com/AeriesSoftware/Posh-AeriesApi) PowerShell module didn't even exist yet, and Aeries had far fewer API endpoints exposed than they do now. I built my original version to hit just the endpoints I needed at the time - nothing fancy, just solving immediate problems.

Then Aeries expanded their API and released their official PowerShell module (which seemed to happen around the same time), hitting all their available endpoints. That was great! But many data points still aren't exposed through the API, and I still needed tooling to access and write data directly via SQL. So SPSAeries evolved into something that supplements the official module rather than replacing it.

## About the SPS Naming Convention

Good news: When Aeries released their official module, I was apparently on the right track - we'd named functions similarly. Bad news: That meant direct conflicts. That's when I adopted the "SPS" prefix (Shasta PowerShell) to differentiate my functions from theirs. It avoids conflicts as both modules evolve, makes it clear which functions come from our district versus the official Aeries module, and keeps all my work PowerShell projects easily identifiable.

## What It Does

The module fills in the gaps where the API falls short:

- **Direct SQL Access**: Query and modify data that isn't available through API endpoints
- **SFTP Integration**: Run SQL queries and automatically upload results to SFTP servers
- **Secure Configuration**: Encrypted storage of API keys and SQL credentials per user account
- **Multi-School Support**: Easy switching between different school configurations
- **Safety Features**: Built-in confirmation prompts for queries that modify data

## Key Functions

- `Invoke-SPSAeriesSqlQuery` - Execute SQL queries directly or from .sql files with safety checks
- `Invoke-SPSAeriesSqlQueryToSftp` - Run queries and upload results to SFTP with timestamp verification
- `Set-SPSAeriesConfiguration` - Manage configurations across different schools and environments
- Support for both password and key-based SFTP authentication

## Why This Exists

Working with over 30 local educational agencies through SUHSD, I kept running into the same limitations - data we needed just wasn't available through the API. Rather than building one-off scripts for each use case, I built a module that could handle the common patterns: direct SQL access when needed, automated exports, and secure credential management.

## Where to Find It

The module is published on [PowerShell Gallery](https://www.powershellgallery.com/packages/SPSAeries) and the source code is on [GitHub](https://github.com/suhsdit/SPSAeries).

## Fair Warning

This module includes commands that write directly to the Aeries SQL database. Test thoroughly in non-production environments first, and use appropriate caution.
