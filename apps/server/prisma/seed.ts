import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

const envPaths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../..", ".env")];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const varietals = [
  {
    id: "cabernet-sauvignon",
    name: "Cabernet Sauvignon",
    color: "RED",
    notes: "Full-bodied with firm tannin, dark fruit, cedar, graphite, and often oak spice.",
    commonDescriptors: ["blackcurrant", "cassis", "cedar", "graphite", "tobacco"],
    typicalRegions: ["Bordeaux", "Napa Valley", "Coonawarra", "Stellenbosch"],
    aliases: ["Cab Sauv"],
  },
  {
    id: "merlot",
    name: "Merlot",
    color: "RED",
    notes: "Plush and rounded, usually showing plum, cherry, chocolate, and softer tannins.",
    commonDescriptors: ["plum", "black cherry", "chocolate", "bay leaf", "vanilla"],
    typicalRegions: ["Bordeaux", "Napa Valley", "Chile", "Tuscany"],
    aliases: [],
  },
  {
    id: "pinot-noir",
    name: "Pinot Noir",
    color: "RED",
    notes: "Light to medium-bodied with red fruit, high perfume, earthy notes, and silky tannin.",
    commonDescriptors: ["cherry", "raspberry", "mushroom", "forest floor", "rose"],
    typicalRegions: ["Burgundy", "Oregon", "Central Otago", "Yarra Valley"],
    aliases: ["Spatburgunder", "Blauburgunder"],
  },
  {
    id: "syrah-shiraz",
    name: "Syrah / Shiraz",
    color: "RED",
    notes: "Deeply colored with blackberry, pepper, smoke, olive, and medium to high tannin.",
    commonDescriptors: ["blackberry", "black pepper", "smoke", "olive", "violet"],
    typicalRegions: ["Northern Rhone", "Barossa", "Stellenbosch", "Washington"],
    aliases: ["Syrah", "Shiraz"],
  },
  {
    id: "grenache",
    name: "Grenache",
    color: "RED",
    notes: "Warm, generous red fruit, spice, higher alcohol, and moderate tannin.",
    commonDescriptors: ["strawberry", "raspberry", "white pepper", "garrigue", "licorice"],
    typicalRegions: ["Southern Rhone", "Priorat", "Gredos", "McLaren Vale"],
    aliases: ["Garnacha", "Cannonau"],
  },
  {
    id: "tempranillo",
    name: "Tempranillo",
    color: "RED",
    notes: "Savory red and black fruit with leather, dill or coconut from oak, and dusty tannin.",
    commonDescriptors: ["red cherry", "leather", "dill", "tobacco", "vanilla"],
    typicalRegions: ["Rioja", "Ribera del Duero", "Toro", "Alentejo"],
    aliases: ["Tinta Roriz", "Aragonez"],
  },
  {
    id: "sangiovese",
    name: "Sangiovese",
    color: "RED",
    notes: "High acid, firm tannin, sour cherry, tomato leaf, herbs, and savory earth.",
    commonDescriptors: ["sour cherry", "tomato leaf", "oregano", "leather", "earth"],
    typicalRegions: ["Chianti", "Brunello di Montalcino", "Montefalco", "Corsica"],
    aliases: ["Brunello", "Nielluccio"],
  },
  {
    id: "nebbiolo",
    name: "Nebbiolo",
    color: "RED",
    notes: "Pale color but powerful tannin and acid, with rose, tar, cherry, and truffle.",
    commonDescriptors: ["rose", "tar", "cherry", "truffle", "anise"],
    typicalRegions: ["Barolo", "Barbaresco", "Gattinara", "Valtellina"],
    aliases: ["Spanna", "Chiavennasca"],
  },
  {
    id: "malbec",
    name: "Malbec",
    color: "RED",
    notes: "Deep purple with plum, blackberry, cocoa, violet, and rounded tannins.",
    commonDescriptors: ["plum", "blackberry", "violet", "cocoa", "sweet spice"],
    typicalRegions: ["Mendoza", "Cahors", "Uco Valley", "Patagonia"],
    aliases: ["Cot", "Auxerrois"],
  },
  {
    id: "zinfandel",
    name: "Zinfandel",
    color: "RED",
    notes: "Jammy blackberry and raspberry, pepper, high alcohol, and sweet baking spice.",
    commonDescriptors: ["bramble", "blackberry jam", "pepper", "cinnamon", "licorice"],
    typicalRegions: ["California", "Puglia", "Lodi", "Dry Creek Valley"],
    aliases: ["Primitivo"],
  },
  {
    id: "gamay",
    name: "Gamay",
    color: "RED",
    notes: "Light-bodied and juicy with red berries, banana or bubblegum in carbonic styles, and soft tannin.",
    commonDescriptors: ["strawberry", "raspberry", "violet", "banana", "granite"],
    typicalRegions: ["Beaujolais", "Loire Valley", "Niagara", "Oregon"],
    aliases: ["Gamay Noir"],
  },
  {
    id: "cabernet-franc",
    name: "Cabernet Franc",
    color: "RED",
    notes: "Medium-bodied with crunchy red fruit, herbs, bell pepper, graphite, and fresh acidity.",
    commonDescriptors: ["raspberry", "bell pepper", "graphite", "violet", "leafy herbs"],
    typicalRegions: ["Loire Valley", "Bordeaux", "Finger Lakes", "Stellenbosch"],
    aliases: ["Bouchet"],
  },
  {
    id: "pinotage",
    name: "Pinotage",
    color: "RED",
    notes: "South Africa's signature red, typically showing plum, blackberry, smoke, coffee, earth, and firm but rounded tannin.",
    commonDescriptors: ["plum", "blackberry", "smoke", "coffee", "earth"],
    typicalRegions: ["Stellenbosch", "Swartland", "Paarl", "Darling"],
    aliases: [],
  },
  {
    id: "cinsault",
    name: "Cinsault",
    color: "RED",
    notes: "Light to medium-bodied with bright red fruit, florals, soft tannin, and a fresh, sometimes savory finish.",
    commonDescriptors: ["cherry", "raspberry", "violet", "spice", "savory herbs"],
    typicalRegions: ["Swartland", "Paarl", "Stellenbosch", "Southern Rhone"],
    aliases: ["Cinsaut", "Hermitage"],
  },
  {
    id: "roobernet",
    name: "Roobernet",
    color: "RED",
    notes: "Deeply colored South African teinturier with berry fruit, grassiness, nutty accents, and Cabernet-like structure.",
    commonDescriptors: ["blackberry", "grass", "nuts", "blackcurrant", "firm tannin"],
    typicalRegions: ["Breedekloof", "Robertson", "Swartland", "Paarl", "Stellenbosch"],
    aliases: [],
  },
  {
    id: "chardonnay",
    name: "Chardonnay",
    color: "WHITE",
    notes: "Ranges from citrus and mineral to full, creamy, buttery, and oak-spiced.",
    commonDescriptors: ["lemon", "apple", "butter", "toast", "hazelnut"],
    typicalRegions: ["Burgundy", "California", "Margaret River", "Walker Bay"],
    aliases: [],
  },
  {
    id: "sauvignon-blanc",
    name: "Sauvignon Blanc",
    color: "WHITE",
    notes: "High-acid and aromatic, showing citrus, passion fruit, grass, herbs, or flint.",
    commonDescriptors: ["lime", "gooseberry", "passion fruit", "grass", "flint"],
    typicalRegions: ["Loire Valley", "Marlborough", "Bordeaux", "Elgin"],
    aliases: ["Sauv Blanc"],
  },
  {
    id: "riesling",
    name: "Riesling",
    color: "WHITE",
    notes: "High acid with lime, green apple, jasmine, stone fruit, and petrol with age.",
    commonDescriptors: ["lime", "green apple", "peach", "jasmine", "petrol"],
    typicalRegions: ["Mosel", "Alsace", "Clare Valley", "Finger Lakes"],
    aliases: [],
  },
  {
    id: "chenin-blanc",
    name: "Chenin Blanc",
    color: "WHITE",
    notes: "High acid with apple, quince, honey, wool, and styles from dry to sweet.",
    commonDescriptors: ["quince", "apple", "honey", "wool", "ginger"],
    typicalRegions: ["Loire Valley", "Swartland", "Stellenbosch", "California"],
    aliases: ["Steen"],
  },
  {
    id: "colombard",
    name: "Colombard",
    color: "WHITE",
    notes: "Fresh, high-acid white often showing green apple, citrus, tropical fruit, and a crisp neutral core.",
    commonDescriptors: ["green apple", "lemon", "guava", "melon", "fresh herbs"],
    typicalRegions: ["Breedekloof", "Robertson", "Olifants River", "California"],
    aliases: ["Colombar", "French Colombard"],
  },
  {
    id: "crouchen-blanc",
    name: "Crouchen Blanc / Cape Riesling",
    color: "WHITE",
    notes: "South African Cape Riesling is not true Riesling; expect light-bodied citrus, green apple, floral lift, and steely acidity.",
    commonDescriptors: ["lime", "green apple", "white flowers", "pear", "mineral"],
    typicalRegions: ["Breedekloof", "Paarl", "Tulbagh", "Robertson"],
    aliases: ["Cape Riesling", "Kaapse Riesling", "Paarl Riesling", "Clare Riesling"],
  },
  {
    id: "muscat-of-alexandria",
    name: "Muscat of Alexandria / Hanepoot",
    color: "DESSERT",
    notes: "Highly aromatic Muscat used for dry, sweet, and fortified styles, with grape, orange blossom, raisins, and honey.",
    commonDescriptors: ["grape", "orange blossom", "honey", "raisin", "apricot"],
    typicalRegions: ["Paarl", "Breedekloof", "Robertson", "Northern Cape"],
    aliases: ["Hanepoot", "Muscat d'Alexandrie", "Moscatel de Alejandria"],
  },
  {
    id: "palomino",
    name: "Palomino",
    color: "WHITE",
    notes: "Neutral, low-aroma white with apple, almond, saline notes, and a soft texture; historically important in fortified styles.",
    commonDescriptors: ["apple", "almond", "salt", "lemon", "bread dough"],
    typicalRegions: ["Jerez", "Robertson", "Breedekloof", "Worcester"],
    aliases: ["White French", "Palomino Fino"],
  },
  {
    id: "trebbiano-ugni-blanc",
    name: "Trebbiano / Ugni Blanc",
    color: "WHITE",
    notes: "High-acid, neutral white with lemon, green apple, and subtle herbs, often used for brandy or blending.",
    commonDescriptors: ["lemon", "green apple", "pear", "herbs", "neutral"],
    typicalRegions: ["Cognac", "Tuscany", "Robertson", "Breedekloof"],
    aliases: ["Ugni Blanc", "Trebbiano Toscano"],
  },
  {
    id: "chenel",
    name: "Chenel",
    color: "WHITE",
    notes: "South African Chenin Blanc and Ugni Blanc cross with neutral fruit, high acidity, and a clean blending profile.",
    commonDescriptors: ["green apple", "lemon", "pear", "high acid", "neutral"],
    typicalRegions: ["Robertson", "Olifants River", "Northern Cape"],
    aliases: ["K1"],
  },
  {
    id: "nouvelle",
    name: "Nouvelle",
    color: "WHITE",
    notes: "South African white with distinctive grassy, green pepper notes, sometimes showing bubblegum or fruit-drop aromas when ripe.",
    commonDescriptors: ["grass", "green pepper", "gooseberry", "bubblegum", "citrus"],
    typicalRegions: ["Robertson", "Worcester", "Breedekloof", "Paarl"],
    aliases: ["Grass 26"],
  },
  {
    id: "weldra",
    name: "Weldra",
    color: "WHITE",
    notes: "Rare South African Chenin Blanc and Ugni Blanc cross with firm acidity and mostly neutral citrus and apple fruit.",
    commonDescriptors: ["lemon", "green apple", "pear", "high acid", "neutral"],
    typicalRegions: ["Robertson", "South Africa"],
    aliases: ["K2"],
  },
  {
    id: "therona",
    name: "Therona",
    color: "WHITE",
    notes: "Rare Stellenbosch-developed white with floral aromatics, peach, green apple, and a rounded palate.",
    commonDescriptors: ["white flowers", "peach", "green apple", "vanilla", "citrus"],
    typicalRegions: ["Stellenbosch"],
    aliases: [],
  },
  {
    id: "pinot-gris",
    name: "Pinot Gris / Pinot Grigio",
    color: "WHITE",
    notes: "Typically pear, apple, citrus, and almond, ranging from crisp to rich and oily.",
    commonDescriptors: ["pear", "apple", "lemon", "almond", "honey"],
    typicalRegions: ["Alsace", "Friuli", "Oregon", "Trentino-Alto Adige"],
    aliases: ["Pinot Grigio", "Grauburgunder"],
  },
  {
    id: "gewurztraminer",
    name: "Gewurztraminer",
    color: "WHITE",
    notes: "Intensely aromatic with lychee, rose, ginger, low acid, and a rich texture.",
    commonDescriptors: ["lychee", "rose", "ginger", "turkish delight", "spice"],
    typicalRegions: ["Alsace", "Trentino-Alto Adige", "New Zealand", "Germany"],
    aliases: ["Gewurz"],
  },
  {
    id: "viognier",
    name: "Viognier",
    color: "WHITE",
    notes: "Full, floral, and low to medium acid with apricot, peach, honeysuckle, and spice.",
    commonDescriptors: ["apricot", "peach", "honeysuckle", "ginger", "orange blossom"],
    typicalRegions: ["Condrieu", "Languedoc", "California", "Barossa"],
    aliases: [],
  },
  {
    id: "semillon",
    name: "Semillon",
    color: "WHITE",
    notes: "Waxy citrus and lanolin when young, developing honey, toast, and nuts with age.",
    commonDescriptors: ["lemon curd", "wax", "lanolin", "honey", "toast"],
    typicalRegions: ["Hunter Valley", "Bordeaux", "Margaret River", "Stellenbosch"],
    aliases: [],
  },
] satisfies Prisma.VarietalCreateManyInput[];

async function main() {
  await prisma.varietal.createMany({
    data: varietals,
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
