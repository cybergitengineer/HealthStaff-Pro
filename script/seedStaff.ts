import { db } from "../server/db";
// Direct relative path to avoid the @shared alias error
import {
  users,
  workerProfiles,
  applications,
  assignments,
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Starting deep cleanup of related data...");

  // 1. IDENTIFY WORKERS
  const existingWorkers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "WORKER"));

  const workerIds = existingWorkers.map((w) => w.id);

  if (workerIds.length > 0) {
    console.log(`Clearing dependencies for ${workerIds.length} workers...`);

    // 2. DELETE IN HIERARCHICAL ORDER (Deepest links first)
    // Clear assignments and applications first to respect foreign keys
    await db
      .delete(assignments)
      .where(inArray(assignments.workerId, workerIds));
    await db
      .delete(applications)
      .where(inArray(applications.workerId, workerIds));

    // Clear profiles second
    await db
      .delete(workerProfiles)
      .where(inArray(workerProfiles.userId, workerIds));

    // 3. DELETE USERS LAST (The parent record)
    await db.delete(users).where(inArray(users.id, workerIds));

    console.log("Cleanup complete.");
  }

  // 4. PREPARE THE DATA
  // Ensure every string is wrapped in backticks
  const rawTextData = [
    `Amos +1 (682) 373-5972`,
    `Anne Tsitsi +1 (402) 619-7195`,
    `Wisdom +1 (469) 395-7071`,
    `Ba Russel +1 (682) 431-8415`,
    `Bernadette +1 (214) 554-7565`,
    `Berries +1 (434) 484-5759`,
    `Blessed +1 (470) 940-4391`,
    `Blossom +1 (301) 820-5475`,
    `Bobb +1 (214) 931-1545`,
    `Boss Ipah +1 (469) 446-0280`,
    `Bright +1 (945) 335-5848`,
    `Brittah +1 (201) 481-1477`,
    `Busie +1 (469) 554-2539`,
    `Cassey +1 (945) 349-6744`,
    `Chantelle +1 (907) 419-2758`,
    `Diorbaby +1 (505) 595-4059`,
    `Drum (Vambire) +1 (469) 592-9308`,
    `Edy +1 (972) 989-6075`,
    `egyncube +1 (972) 989-6027`,
    `Esnath +1 (945) 946-1233`,
    `Faffy +1 (646) 296-4806`,
    `Farai +1 (203) 506-3440`,
    `Flo Rence +1 (469) 560-6167`,
    `Gamu +1 (214) 579-3822`,
    `Gamu Miranda +1 (908) 733-2405`,
    `Getrude Munda +1 (469) 661-6173`,
    `Glory To God +1 (223) 901-3143`,
    `God’s Grace +1 (972) 834-0077`,
    `Heart Contact +1 (571) 546-6684`,
    `Icing +1 (469) 845-6205`,
    `Isheanopa +1 (682) 970-0596`,
    `J.Peter +1 (737) 359-5278`,
    `jeromesdallas +1 (903) 718-7040`,
    `Lulu Lemon +1 (443) 501-5788`,
    `Mandie +1 (945) 358-6102`,
    `Matindo +1 (636) 463-4713`,
    `Mom BOYS +1 (346) 264-3265`,
    `monicamadondobradley +1 (682) 300-0419`,
    `Mother of two +1 (945) 354-4188`,
    `Ms Taurus +1 (770) 877-4173`,
    `Mugoes +1 (945) 371-0921`,
    `Mukundi +1 (469) 781-8275`,
    `mwenewazvo +1 (972) 880-1733`,
    `Nella +1 (214) 342-1974`,
    `Ngonzi +1 (318) 570-0666`,
    `Nippa +1 (469) 260-3631`,
    `Nonsi +1 (214) 431-6024`,
    `Obinna +1 (603) 550-9979`,
    `Okc Number +1 (405) 500-6580`,
    `PSLA +1 (281) 475-1527`,
    `R.K. Sweetie +1 (201) 993-7534`,
    `Renewed +1 (616) 822-4632`,
    `Samantha M +1 (682) 384-2619`,
    `Sandy +1 (469) 468-2252`,
    `Sbahle Mpanza +1 (309) 835-3486`,
    `Shelly Belly +1 (817) 349-5071`,
    `Skullcandy +1 (716) 306-9431`,
    `Sostina Nyashanu +1 (469) 628-9963`,
    `taf +1 (929) 736-7283`,
    `Tari mo +1 (469) 918-1363`,
    `tendah +1 (346) 620-8911`,
    `Tendai +1 (203) 675-8898`,
    `Terry Muttayi +1 (945) 274-1713`,
    `The Stoic +1 (945) 942-7588`,
    `Tino +1 (945) 360-9485`,
    `TM RB M +1 (201) 951-0515`,
    `TOMJAZZY BABA HOBHO +1 (469) 615-5141`,
    `Uloma +1 (806) 654-7183`,
    `Wildy +1 (907) 987-9986`,
  ];

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("password123", salt);

  const processedData = rawTextData.map((entry, index) => {
    const parts = entry.split(" ");
    const phone = parts.pop() || "";
    const name = parts.join(" ").trim();
    const staffId = `staff_${Math.random().toString(36).substring(7)}_${index}`;

    return {
      passwordHash: hashedPassword,
      email: `${staffId}@healthstaffpro.com`,
      firstName: name.split(" ")[0] || "Staff",
      lastName: name.split(" ").slice(1).join(" ") || "",
      phone: phone,
      role: "WORKER" as const,
    };
  });

  // 5. INSERT
  console.log(`Inserting ${processedData.length} workers...`);
  await db.insert(users).values(processedData);
  console.log("--- DATABASE SEEDED SUCCESSFULLY ---");
}

main().catch(console.error);
