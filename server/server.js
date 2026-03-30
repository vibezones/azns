const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3553;
const ZONES_DIR = path.join(__dirname, "..", "zones");

app.use(cors());
app.use(express.static(ZONES_DIR));

app.listen(PORT, () => {
  console.log(`Alt DNS server running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/?domain=💀`);
});
