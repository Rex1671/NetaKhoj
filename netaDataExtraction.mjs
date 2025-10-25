// file: parseCandidate.mjs
import fs from "fs";
import * as cheerio from "cheerio";

function parseCandidate(html) {
  const $ = cheerio.load(html);
  const getText = (sel) => $(sel).text().trim() || "";

  const data = {
    personalInfo: {},
    crimeOMeter: { numberOfCriminalCases: "", briefDetails: [], casesPending: [], casesConvicted: [] },
    assetsLiabilities: {},
    panIncomeTaxDetails: [],
    sourcesOfIncome: {},
    professionOccupation: {},
    liabilitiesDetails: [],
    immovableAssets: [],
    movableAssets: []
  };

  // PERSONAL
  const infoDiv = $(".w3-panel").filter((i, div) => $(div).text().includes("Name Enrolled as Voter in")).first();
  if (infoDiv.length) {
    const t = infoDiv.text().replace(/\s+/g, " ").trim();
    const voter = t.match(/Name Enrolled as Voter in:(.*?)Self Profession:/)?.[1]?.trim();
    const selfP = t.match(/Self Profession:(.*?)Spouse Profession:/)?.[1]?.trim();
    const spouseP = t.match(/Spouse Profession:(.*)/)?.[1]?.trim();
    data.personalInfo = { voterDetails: voter || "", selfProfession: selfP || "", spouseProfession: spouseP || "" };
  }

  // CRIME-O-METER
  data.crimeOMeter.numberOfCriminalCases = getText("div[align='center'] span[style*='font-weight:bold']");
  data.crimeOMeter.briefDetails = $(".w3-small ul li").map((i, li) => $(li).text().replace(/\s+/g, " ").trim()).get();
  const tables = $("div.w3-responsive table");
  const pending = tables.filter((i, t) => $(t).prev().text().includes("Cases where Pending"));
  const convicted = tables.filter((i, t) => $(t).prev().text().includes("Cases where Convicted"));
  if (pending.length) data.crimeOMeter.casesPending = pending.find("tr").slice(1).map((i, r) => $(r).find("td").map((j, td) => $(td).text().trim()).get()).get();
  if (convicted.length) data.crimeOMeter.casesConvicted = convicted.find("tr").slice(1).map((i, r) => $(r).find("td").map((j, td) => $(td).text().trim()).get()).get();

  // ASSETS & LIABILITIES
  const assetsTable = $("table.w3-table.w3-striped").filter((i, t) => $(t).text().includes("Assets:"));
  if (assetsTable.length) {
    assetsTable.find("tr").each((i, row) => {
      const cells = $(row).find("td");
      const k = cells.eq(0).text().trim();
      const v = cells.eq(1).text().trim();
      if (/Assets/i.test(k)) data.assetsLiabilities.assets = v;
      if (/Liabilities/i.test(k)) data.assetsLiabilities.liabilities = v;
    });
  }

  // PAN / ITR
  data.panIncomeTaxDetails = $("#income_tax tr").slice(1).map((i, r) => {
    const cells = $(r).find("td");
    const relation = cells.eq(0).text().trim();
    const panGiven = cells.eq(1).text().trim();
    const year = cells.eq(2).text().trim();
    const income = cells.eq(3).text().trim();
    return { relation, panGiven, year, income };
  }).get();

  // INCOME
  const incomeTable = $("#incomesource table");
  if (incomeTable.length) {
    incomeTable.find("tr").each((i, r) => {
      const cells = $(r).find("td");
      const role = cells.eq(0).text().trim();
      const val = cells.eq(1).text().trim();
      if (role && val) data.sourcesOfIncome[role.toLowerCase()] = val;
    });
  }

  // PROFESSION
  const profTable = $("#profession table");
  if (profTable.length) {
    profTable.find("tr").each((i, r) => {
      const cells = $(r).find("td");
      const role = cells.eq(0).text().trim();
      const val = cells.eq(1).text().trim();
      if (role && val) data.professionOccupation[role.toLowerCase()] = val;
    });
  }

  // GENERIC TABLE EXTRACTOR
  const tableToArr = (id) => {
    const t = $(id);
    return t.length ? t.find("tr").slice(1).map((i, r) => $(r).find("td").map((j, td) => $(td).text().trim()).get()).get() : [];
  };

  

  data.liabilitiesDetails = tableToArr("#liabilities");
  data.movableAssets = tableToArr("#movable_assets");
  data.immovableAssets = tableToArr("#immovable_assets");

  return data;
}

export { parseCandidate };

// ---- Run locally on saved HTML ----
// const html = fs.readFileSync("./candidate.htm", "utf-8");
// const result = parseCandidate(html);
// console.log(JSON.stringify(result, null, 2));
