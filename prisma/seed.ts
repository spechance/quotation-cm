import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@chance-marketing.com" },
    update: {},
    create: {
      name: "系統管理員",
      email: "admin@chance-marketing.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  // Create finance user
  const financePassword = await hash("finance123", 12);
  await prisma.user.upsert({
    where: { email: "finance@chance-marketing.com" },
    update: {},
    create: {
      name: "財務主管",
      email: "finance@chance-marketing.com",
      passwordHash: financePassword,
      role: "FINANCE",
    },
  });

  // Create sales user
  const salesPassword = await hash("sales123", 12);
  await prisma.user.upsert({
    where: { email: "sales@chance-marketing.com" },
    update: {},
    create: {
      name: "業務人員",
      email: "sales@chance-marketing.com",
      passwordHash: salesPassword,
      role: "SALES",
    },
  });

  // Create default General Terms Set
  const defaultTerms = await prisma.generalTermsSet.upsert({
    where: { name: "標準條款" },
    update: {},
    create: {
      name: "標準條款",
      terms: JSON.stringify([
        "(一)本協議未約定事項，雙方得以書面方式另行約定，修正時亦同，並依文件最終修改日期做為最終效力。附件為本合約之一部份。",
        "(二)本協議正本由雙方各執乙份。",
        "(三)關於因本協議所生之糾紛，雙方同意依誠信原則協商解決，若有涉訟必要時，雙方合意以臺灣台北地方法院為第一審管轄法院，並以中華民國法律為準據法。",
        "(四)乙方應以善良管理人之注意義務履行本協議，並不得違反法令強制或禁止規定、公共秩序及善良風俗，並應確保遵循保險法、洗錢防制法、個人資料保護法、消費者保護法及其他法令之規定。",
        "(五)除雙方另有約定者外，甲、乙任一方依本協議應為之通知，應以書面方式送達至本協議所載地址。如有變更送達地址時，應以書面通知他方。若依送達地址所為之書面通知，發生送達不到或他方拒收之情形時，則以郵遞日視為送達。",
        "(六)匯款帳號：戶名「全偲行銷有限公司」，「彰化銀行-古亭分行」\n　　銀行代號「009」，帳號「5116-01-880888-00」",
        "(七)付款方式: 每月執行前，甲方需先支付當月費用",
        "(八)甲方實際匯至乙方指定帳戶之金額，應為加計稅金後之金額，且匯款手續費由甲方承擔",
        "(九)報價單有效期限：超過7天回簽報價單，此報價單金額無效。",
        "(十)匯款時間：需14天內完成匯款",
      ]),
    },
  });

  // Create quotation type: 口碑報價單
  const womTerms = [
    "1.本報價效期僅限報價日期起始計十四日；委刊內容為各項合作內容與意涵，附件同合約內容之一。",
    "2.視貼文情況決定回文速度，約1~5天會將指定留言回覆完畢，執行上線內容會以Google雲端Excel呈現。",
    "3.如經客戶修改文案如有違規、違法，貴司堅持置入，我司經評估會造成帳號損失或觸犯法律條例，將有權拒絕執行該篇文案置入，不列入退費。",
    "4.如雙方協議，執行規格可遞延總期間一個月，如因甲方因素未將規格執行，則視為執行完畢，不再補發文",
    "5.如雙方協議，執行期間得延後一個月。惟係可歸責於甲方之原因，導致執行期間遲延者，則視為執行完畢，甲方不得向乙方為任何主張。",
    "6.本專案為專案價格，如違約須支付總契約違約金30%。",
    "7.【合約生效】本委刊單視同正式委刊合約，本合約簽訂完畢後，即刻生效，本服務期間雙方應遵守誠信原則。",
    "8.【合約終止】若因不可抗力因素導致合約全部或部分內容無法執行時，雙方確定中途終止合約，執行方將退款未執行金額，已撰寫的文案尚不退費。",
    "9.【刪文規範】在三日內發文遭論壇刪文，則會另行擬稿，並提供過稿審核，待審核後補發相對應則數至其他論壇。",
    "10. 如口碑文於發佈後七日後遭論壇刪除，不再補行發布。",
  ];

  const womSections = [
    {
      title: "口碑行銷操作",
      items: [
        { description: "短篇議題(300字內、純文字、圖1張)", specification: "開文、回覆", unit: "篇/則", unitPrice: 0 },
        { description: "長篇議題(1,000字內、圖3~6張)", specification: "開文、回覆", unit: "篇/則", unitPrice: 0 },
        { description: "彈性回文(約10~100字，帶風向、負評消毒)", specification: "回覆", unit: "則", unitPrice: 0 },
        { description: "口碑監測(監測關鍵字)", specification: "每個月提供一次監測報表", unit: "組", unitPrice: 0 },
        { description: "結案報告", specification: "每個月提供一次結案報表", unit: "份", unitPrice: 0 },
      ],
    },
  ];

  await prisma.quotationType.upsert({
    where: { code: "WOM" },
    update: {},
    create: {
      name: "口碑報價單",
      code: "WOM",
      description: "口碑行銷操作相關報價",
      sortOrder: 1,
      defaultTerms: JSON.stringify(womTerms),
      defaultSections: JSON.stringify(womSections),
      stampTextA: "發票章用印",
      stampTextB: "發票章用印",
      generalTermsSetId: defaultTerms.id,
    },
  });

  // Create quotation type: FB廣告報價單
  const fbTerms = [
    "1.本委刊單經雙方用印後，代表所需之一切授權，並已確認所有資訊均正確無訛開始執行",
    "2.委刊單確認後，甲方需預先支付所有廣告委刊所需之全額費用後，乙方才起始進行相關廣告活動。",
    "3.甲方同意授權乙方 全偲行銷有限公司 全權管理甲方於 Facebook之帳號權限或建立廣告帳號(美金帳戶)，進行包括調整廣告成本／新增、刪減或修改廣告呈現內容／調整每日預算與調整其他Facebook相關設定內容等。",
    "4.甲方保證其提供乙方之圖像、文字等素材，均為甲方所有或經合法授權使用，並已自行審核符合相關法規規定，乙方不負為甲方審核之責。",
    "5.契約範圍：本契約未盡事宜，雙方所補充、添加、變動或修改的內容，以各種形式文字留存，雙方同意下，視為本契約之一部分。",
    "6.如雙方在合約期間終止，需提前一週告知解約，收到折讓單後，我司將於隔月底退還未花費廣告費，該月全額服務費尚不退款。",
    "7.如經官方多次禁止廣告，為維護雙方企業資產及保障其他顧客權利，乙方有權決定是否可持續執行專案內容。",
    "8.乙方收到廣告費用後，會於固定日，系統自動換匯成美金，儲值進廣告帳戶。",
    "9.新台幣換匯美金之參考匯率，臺灣銀行公告現鈔賣出匯率。",
    "10.退費金額之換匯參考匯率，臺灣銀行公告現鈔買入匯率。",
    "11.本專案為專案價格，如違約須支付總契約違約金30%。",
    "12. 廣告走期依實際上線日為主。",
  ];

  const fbSections = [
    {
      title: "FaceBook廣告執行操作",
      items: [
        { description: "廣告投放", specification: "1.使廣告給特定組群觀看、互動、導購\n2.露出成效較好版位", unit: "月", unitPrice: 0 },
      ],
    },
    {
      title: "廣告服務費",
      items: [
        { description: "操作費用20%", specification: "1.優化廣告設定，達到更高效益\n2.以廣告為核心協助優化相關事宜\n3.提供網站優化建議、文案建議、圖片建議", unit: "月", unitPrice: 0 },
        { description: "結案報告", specification: "1.執行完後,約10個工作天，提供結案報告", unit: "份", unitPrice: 0 },
      ],
    },
    {
      title: "圖文規劃",
      items: [
        { description: "文案撰寫、圖片設計", specification: "1.將客戶重點置入文案中，並依指定目的撰寫相關文案\n2.依照文案內容，設計相對應的圖片，來投遞廣告", unit: "月", unitPrice: 0 },
        { description: "使用規範", specification: "文章及圖片可轉載或引述品牌端使用於網路媒體(Instagram、Line、Facebook 等..)、不含實體通路範圍使用", unit: "", unitPrice: 0 },
      ],
    },
  ];

  await prisma.quotationType.upsert({
    where: { code: "FB" },
    update: {},
    create: {
      name: "FB廣告報價單",
      code: "FB",
      description: "Facebook廣告執行操作相關報價",
      sortOrder: 2,
      defaultTerms: JSON.stringify(fbTerms),
      defaultSections: JSON.stringify(fbSections),
      stampTextA: "發票章用印",
      stampTextB: "發票章用印",
      generalTermsSetId: defaultTerms.id,
    },
  });

  // Initialize quotation sequence
  await prisma.quotationSequence.upsert({
    where: { year: new Date().getFullYear() },
    update: {},
    create: { year: new Date().getFullYear(), lastSeq: 0 },
  });

  console.log("Seed completed!");
  console.log("---");
  console.log("Test accounts:");
  console.log("  Admin:   admin@chance-marketing.com / admin123");
  console.log("  Finance: finance@chance-marketing.com / finance123");
  console.log("  Sales:   sales@chance-marketing.com / sales123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
