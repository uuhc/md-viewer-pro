# Privacy Policy for MD Viewer Pro

**Last Updated:** January 30, 2026

## Introduction

MD Viewer Pro ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle data when you use our Chrome extension.

## Data Collection

**We do not collect, store, or transmit any user data.**

MD Viewer Pro operates entirely locally on your device. All functionality is performed within your browser without any external server communication.

## What Data is Stored Locally

The extension uses Chrome's local storage API (`chrome.storage.local`) to store the following data **exclusively on your device**:

1. **File List**: The list of Markdown files you have added to the extension's workspace, including file paths and metadata (such as last modified time).

2. **User Preferences**: Your theme selection (light/dark/auto), UI state preferences (such as sidebar visibility), and other display settings.

3. **Temporary Preview Data**: When you open a Markdown file via the file:// protocol, the file content is temporarily stored in local memory to enable preview functionality.

**Important**: All this data remains on your device and is never transmitted to any external servers, third-party services, or our servers.

## Permissions Used

### Storage Permission
- **Purpose**: To store your file list and preferences locally
- **Data**: Only local file paths and user preferences
- **Transmission**: None - all data stays on your device

### Tabs Permission
- **Purpose**: To detect when you open Markdown files via file:// protocol
- **Data**: Only the URL of tabs to identify Markdown files
- **Transmission**: None - we only read URLs to detect Markdown files

### Host Permissions (file:///*)
- **Purpose**: To read local Markdown files for preview
- **Data**: Only the content of Markdown files you open
- **Transmission**: None - files are read and displayed locally only

## Third-Party Services

We do not use any third-party analytics, advertising, or tracking services. The extension does not communicate with any external servers.

## Data Sharing

**We do not sell, rent, or share your data with any third parties.**

Since we do not collect any data, there is no data to share, sell, or transfer.

## Your Rights

Since all data is stored locally on your device:

- You can delete all stored data by uninstalling the extension
- You can clear stored data through Chrome's extension settings
- You have full control over your data at all times

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.

## Contact

If you have any questions about this Privacy Policy, please contact us through the extension's support channels.

---

**Summary**: MD Viewer Pro does not collect, store, or transmit any user data. All functionality operates locally on your device.
