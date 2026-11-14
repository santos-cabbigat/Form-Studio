# Form Studio

[Open Form Studio](https://santos-cabbigat.github.io/Form-Studio/)

Design screens for phones, tablets, and laptops. Insert shapes, text, inputs, tables, reusable components, and windows. Preview triggers and export a standalone HTML site or an editable project JSON.

## Bring in a design from HTML and CSS

Choose **Insert → Import editable HTML**, paste a section or open an HTML file, then choose **Check layers**. Include the CSS in a style tag or under **Additional CSS**. Choose **Current screen** to append the section below existing content or **New screen** to start a separate design. **Add layers** creates individual Studio objects. Drag a button, resize a table, or change its label and inspect the generated code. Undo removes the import in one step.

The import measures the laptop, tablet and phone layouts using the project widths. Positions and dimensions remain editable per device. Supported appearance is shared across layouts. The conversion captures static content; scripts, external stylesheets, database connections, and accounting logic need their own integration. For a React or other framework app, supply the rendered screen HTML and its CSS. For a Form Studio project, import its editable JSON to recover its existing triggers and templates.

## Edit a layered component

Open **Layers → Select multiple** and select each layer, including layers hidden behind another shape. You can also use the canvas multi-select tool or Shift-click. Choose **Group**. Tap one member to select the group, then open **Inspector → Code → Copy for ChatGPT**. The copy contains all member layers and triggers together. Paste the complete returned block over the selection and choose **Apply code**. Undo restores the prior state. To edit a complete window, select it in the screen menu, then open Code. Positions and sizes in a snippet use the current device layout.

## Projects and personal storage

Open **Files → New project** to create a separate design. Each project autosaves in the current browser. Use **Sign in / Create account** with your personal app email to save a project to your cloud and open it on another device. After the first cloud save, further edits upload automatically unless you turn off that project’s automatic saves. Cloud projects live in the personal Supabase project under owner-only access. Clearing browser site data removes device copies. Download an editable JSON backup from Files. Existing single-workspace saves are preserved. Importing JSON opens it as a new project.

## Preview a data-entry flow

**Insert → Sample entry form** adds an editable example with an account dropdown, amount, Save button, and table. In **Preview**, try an empty table, sample rows, required-field validation, and a successful save. You can design a custom flow by adding inputs and a table, then choosing **Triggers → Add trigger → Save… → A sample table**. Choose the destination by screen and table name, match input fields to columns, and enter your success message. Input choices can have separate labels and stored values. Designed sample rows belong to the project. Rows entered while running the preview or exported prototype last for that run.

## Pickers and action destinations

Choose **Insert → Picker** for a date, month, year, dropdown, or searchable account picker. In Inspector, set the date display format, popup colors, width and text size. Account and dropdown choices have separate display labels and stored values. Use **Extra button inside popup** to reuse an existing button, or place a button beside the field and select **Triggers → Control a picker**. The **Picker with buttons** template has a working example.

Configure each button by selecting an event, an action and the fields it affects. **Save…** offers a sample table, a named value for this run, another field, or a simulated password change. **Clear…** affects the fields you select. **Value changed** also lets a picker run a trigger when a visitor makes a selection. Preview can simulate saving, failure and offline feedback. Password simulations accept dummy input and discard it. A production integration requires a separate backend.

Choose a component or group and use **Inspector → Place linked copy** to share its content and appearance across screens. Each copy has its own position and triggers. **Detach this copy** makes it independent again.

## Screen and component source

**Files → Project code** shows each screen or window, its groups and components, and shared project files. Use **Add code block** for an embedded component such as a sidebar. Editing a layer in the inspector updates its source. In the multi-file export, screen files assemble the component files, shared runtime code follows trigger connections, and navigation is generated for every screen. Choose **Export → Project source · ZIP**, extract the whole ZIP, and open `index.html`. The standalone HTML export also works offline. Editable JSON includes templates.

GitHub Pages serves the editor from the repository root. The personal database setup is in `supabase/form-studio.sql` and `supabase/form-studio-projects.sql`, in that order.
