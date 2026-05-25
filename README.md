# Land CHaracterization Software (LChS)

A web-based tool for creating, editing, and managing land cover legends following the [Land Cover MetaLanguage (LCML)](https://www.iso.org/standard/81259.html) standard (ISO 19144-2). Developed in collaboration with the [Food and Agriculture Organization of the United Nations (FAO)](https://www.fao.org).

---

## Features

- **Legend Builder** — Create structured land cover legends using FAO-defined blocks and characteristics with a guided, step-by-step wizard.
- **Tree View** — Browse and edit the full classification hierarchy of a legend interactively.
- **LCML Editor** — View and edit the underlying LCML XML representation of a legend.
- **Semantic Interoperability** — Compare and connect legends from different classification systems:
  - *Similarity Assessment* — Upload two legends and quantify how similar their classes are.
  - *Legend Connector* — Map classes between a reference system and an uploaded legend using a rule-based engine with plugin support.
- **Import / Export** — Import existing legends (LCML XML, CSV) and export validated legends in multiple formats.
- **Local Storage** — Save, load, and manage multiple legends directly in the browser without a backend.
- **User-Defined Characteristics** — Extend the built-in characteristic set with custom attributes.
- **Diagram View** — Mermaid-powered visualisations of the classification flow and class relationships.
- **Guided Tour** — In-app walkthrough for first-time users.
- **Land Cover Registry** — Quick link to the [FAO Land Cover Legend Registry](https://data.apps.fao.org/lclr-tool/en/).

---

## Prerequisites

- [Node.js](https://nodejs.org/) 16 or later
- npm (bundled with Node.js)

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm start
```

The app runs on **http://localhost:10002** by default.

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
```

The optimised build is output to the `build/` folder, ready to be served by any static file host.

---

## Data Sources

The application loads its reference data from JSON files in `public/components/DataSources/`:

| File | Description |
|---|---|
| `LC_Legend.json` | Default legend template |
| `LC_Blocks.json` | FAO-defined land cover blocks |
| `LC_Characteristics.json` | Classification characteristics |
| `Block_Block_LookUp.json` | Block-to-block relationships |
| `Block_Characteristic-LookUp.json` | Block-to-characteristic relationships |
| `LC_Options.json` | Dropdown options for characteristics |
| `Legend_Translator.json` | Vocabulary mapping for semantic interoperability |

---

## Standards & References

- [ISO 19144-2 — Land Cover MetaLanguage (LCML)](https://www.iso.org/standard/81259.html)
- [FAO Land Cover Classification System (LCCS)](http://www.geovis.net/Downloads.htm)
- [FAO Land Cover Toolbox](https://www.fao.org/land-water/land/land-governance/land-resources-planning-toolbox/category/details/en/c/1036361/)
- [ISO/TC 211 Advisory Group 13 on Land Cover and Land Use](https://www.fao.org/geospatial/events/events-detail/TC211-Advisory-Group-13-Land-Cover-Land-Use/en)
- [International Standards Organization (ISO/TC 211)](https://www.iso.org/committee/54904.html)

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| PrimeReact / PrimeFlex | Component library and layout |
| Mermaid | Diagram rendering |
| ReactFlow | Node-graph visualisation |
| react-hook-form | Form management |
| xml2js | LCML XML parsing |
| PapaParse | CSV import |
| JSZip + file-saver | Export packaging |
| Quill | Rich-text editing |
