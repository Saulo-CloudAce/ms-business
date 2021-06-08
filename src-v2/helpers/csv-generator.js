// const ObjectsToCsv = require("objects-to-csv");

// async function generateCSV(data = [], filename = "") {
//   try {
//     const csv = new ObjectsToCsv(data);
//     await csv.toDisk(filename);
//     console.log("CSV gerado");
//     return filename;
//   } catch (err) {
//     console.error(err);
//     return { error: "Ocorreu erro ao tentar gerar o arquivo CSV." };
//   }
// }
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
async function generateCSV(header = [], data = [], filename = "") {
  try {
    const csvWriter = createCsvWriter({
      path: filename,
      header,
    });
    csvWriter.writeRecords(data);
    console.log("CSV gerado");
  } catch (err) {
    console.error(err);
    return { error: "Ocorreu erro ao tentar gerar o arquivo CSV." };
  }
}
module.exports = {
  generateCSV,
};
