# Form Studio

[Open Form Studio](https://santos-cabbigat.github.io/Form-Studio/)

Design screens for phones, tablets, and laptops. Insert shapes, text, inputs, tables, reusable components, and windows. Preview triggers and export a standalone HTML site or an editable project JSON.

[Download the illustrated user handbook](Form-Studio-Handbook.pdf). First-time owners use **Set up Studio password** with their privately supplied one-time code. Save the recovery code displayed after setup.

## Bring in a design from HTML and CSS

Choose **Insert → Import editable HTML**, paste a section or open an HTML file, then choose **Check layers**. Include the CSS in a style tag or under **Additional CSS**. Choose **Current screen** to append the section below existing content or **New screen** to start a separate design. **Add layers** creates individual Studio objects. Drag a button, resize a table, or change its label and inspect the generated code. Undo removes the import in one step.

The importer counts source bytes and elements. A section may have 5,000 lines or more, within 2 MiB of HTML and CSS, 60,000 HTML elements and 8,000 visible layers per layout. A table is a single layer with editable rows. Long screens open at a readable width and scroll vertically.

The import measures the laptop, tablet and phone layouts using the project widths. Positions and dimensions remain editable per device. Supported appearance is shared across layouts. The conversion captures static content; scripts, external stylesheets, database connections, and accounting logic need their own integration. For a React or other framework app, supply the rendered screen HTML and its CSS. For a Form Studio project, import its editable JSON to recover its existing triggers and templates.

## Edit a layered component

Select a layer and open **Inspector → Code** to edit its HTML and CSS directly. **Expand code** gives the editor more space. For example, change a button’s `font-weight` to `bold` or `color` to `#197344`, then choose **Apply code**. You can also use inline tags such as `<strong>` or `<span style="color: #197344">` inside a button or text label.

To add a new section directly from Code, select the layer it should follow, open Code, paste plain HTML and CSS over the highlighted snippet, and choose **Apply code**. The existing layer and its triggers are preserved. To specify a position among several layers, open the screen’s Code and paste the HTML between their `<template data-layer>` blocks. One Undo reverses the insertion.

Open **Layers → Select multiple** and select each layer, including layers hidden behind another shape. You can also use the canvas multi-select tool or Shift-click. Choose **Group**. Tap one member to select the group, then open **Inspector → Code → Copy for ChatGPT**. The copy contains all member layers and triggers together. Paste the complete returned block over the selection and choose **Apply code**. Undo restores the prior state. To edit a complete window, select it in the screen menu, then open Code. Positions and sizes in a snippet use the current device layout.

## Projects and personal storage

Open Form Studio online once in each browser and wait for **Ready offline** in the footer. You can then close the tab, disconnect, and reopen the same Form Studio address. The editor, its templates, previews, color sampler, and exports use files stored by that browser.

Open **Files → New project** for a separate design. Applied edits autosave in the current browser, including while offline. Look for **Saved on this device**. Clearing site data can remove both the offline editor and the device copies of your projects. **Files → Download project JSON** gives you an editable backup.

Unapplied Code drafts also save in this browser. To recover one, return to the same project, screen, layout, and selection and open **Code**. Choose **Apply code** to include that change in the design, cloud copy, and export.

For a second copy, open **Files → Open cloud projects**, then **Save current project to cloud** for each project you want in your personal Supabase. Linked projects upload subsequent edits when the editor is open, online, and signed in with automatic saves enabled. Turn off automatic saves to upload only the versions you choose. An offline or interrupted upload stays pending. If your sign-in has expired or you closed the tab, sign in again to resume your pending saves. **Saved on this device and in cloud** confirms that the current local revision has reached the cloud. On another device, sign in and select the project under **My cloud projects**.

## Preview a data-entry flow

**Insert → Sample entry form** adds an editable example with an account dropdown, amount, Save button, and table. In **Preview**, try an empty table, sample rows, required-field validation, and a successful save. You can design a custom flow by adding inputs and a table, then choosing **Triggers → Add trigger → Save… → A sample table**. Choose the destination by screen and table name, match input fields to columns, and enter your success message. Input choices can have separate labels and stored values. Designed sample rows belong to the project. Rows entered while running the preview or exported prototype last for that run.

## Pickers and action destinations

Choose **Insert → Picker** for a date, month, year, dropdown, or searchable account picker. In Inspector, set the date display format, popup colors, width and text size. Account and dropdown choices have separate display labels and stored values. Use **Extra button inside popup** to reuse an existing button, or place a button beside the field and select **Triggers → Control a picker**. The **Picker with buttons** template has a working example.

Configure each button by selecting an event, an action and the fields it affects. **Save…** offers a sample table, a named value for this run, another field, or a simulated password change. **Clear…** affects the fields you select. **Value changed** also lets a picker run a trigger when a visitor makes a selection. Preview can simulate saving, failure and offline feedback. Password simulations accept dummy input and discard it. A production integration requires a separate backend.

Choose a component or group and use **Inspector → Place linked copy** to share its content and appearance across screens. Each copy has its own position and triggers. **Detach this copy** makes it independent again.

## Screen and component source

**Files → Project code** shows each screen or window, its groups and components, and shared project files. Use **Add code block** for an embedded component such as a sidebar. Editing a layer in the inspector updates its source. In the multi-file export, screen files assemble the component files, shared runtime code follows trigger connections, and navigation is generated for every screen. Choose **Export → Project source · ZIP**, extract the whole ZIP into one folder, then double-click `index.html`. Keep its accompanying files in that folder. Resize the browser window to preview the laptop, tablet, and phone layouts. **Export → Working website · HTML** gives you a single file that opens offline. To continue visually editing, open the ZIP’s `design.studio.json` with **Files → Import JSON**.

GitHub Pages serves the editor from the repository root. The personal database setup is in `supabase/form-studio.sql` and `supabase/form-studio-projects.sql`, in that order, followed by `supabase/form-studio-access.sql`. The website uses a dedicated Studio password and an opaque session limited to Studio project operations.

When publishing changes to the offline editor files, give `SHELL_VERSION` in `sw.js` a new value in the same release. Existing tabs finish using their cached version. A new version takes over after its files have downloaded and the previous editor tabs close.
