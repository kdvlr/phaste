# 13. Three-Pane Notes Workspace with Hybrid Hashtag Category Detection

Date: 2026-10-29

## Context
Phaste was initially designed as a single-column timeline with an Omnibar and transient modal inspections. As users capture longer-form notes, code files, recipes, and rich references, navigating solely by date becomes inefficient, and content cannot be edited or categorized effortlessly.

## Decision
1. **Three-Pane Workspace Architecture**:
   - **Pane 1 (Sidebar)**: Houses system collections (`All Phastes`, `Today`, `Pinned`, `Media`, `Untagged`, `Archive`, `Trash`) and automatic categories/tags with counts.
   - **Pane 2 (List Feed)**: Card list with title, highlighted tags, thumbnails, pin badges, and search/compose actions.
   - **Pane 3 (Note Canvas)**: Interactive editor with live markdown formatting, table support, hero media, and bottom formatting toolbar.
   - **Mobile Layout**: Stacks the 3 panes into a drill-down navigation flow (Category Drawer -> Card Feed -> Note Canvas) matching the native iOS Notes paradigm.
2. **Hybrid Hashtag & LiteLLM Category Detection**:
   - Explicit inline hashtags (e.g. `#bear`, `#code`, `#recipe`) are extracted directly from content as flat category tags with live counts in the sidebar.
   - When no hashtags are present in the text, LiteLLM (`gemini-flash` via LiteLLM gateway) infers category tags asynchronously.
   - LiteLLM suggests contextual leading emojis for titles (e.g. `🐼 Polar Bears`), with inline user editing supported in Pane 3.
   - Existing phastes in PostgreSQL are automatically backfilled on deployment.
3. **Storage & Verification**:
   - Retain existing PostgreSQL backend with GIN-indexed tags/categories for instant filtering.
   - All AI calls strictly route through the existing LiteLLM proxy (`http://litellm:4000/v1`).
