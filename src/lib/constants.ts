export const COMPANY_INFO = {
  name: "全偲行銷有限公司",
  nameEn: "Chance Marketing Co., Ltd.",
  address: "114台北市內湖區瑞湖街158號2樓",
  taxId: "82810393",
  phone: "02-2368-1518",
  bank: {
    name: "彰化銀行-古亭分行",
    code: "009",
    account: "5116-01-880888-00",
    holder: "全偲行銷有限公司",
  },
} as const;

export const GENERAL_TERMS = [
  "(一)本協議未約定事項，雙方得以書面方式另行約定，修正時亦同，並依文件最終修改日期做為最終效力。附件為本合約之一部份。",
  "(二)本協議正本由雙方各執乙份。",
  "(三)關於因本協議所生之糾紛，雙方同意依誠信原則協商解決，若有涉訟必要時，雙方合意以臺灣台北地方法院為第一審管轄法院，並以中華民國法律為準據法。",
  "(四)乙方應以善良管理人之注意義務履行本協議，並不得違反法令強制或禁止規定、公共秩序及善良風俗，並應確保遵循保險法、洗錢防制法、個人資料保護法、消費者保護法及其他法令之規定。",
  "(五)除雙方另有約定者外，甲、乙任一方依本協議應為之通知，應以書面方式送達至本協議所載地址。如有變更送達地址時，應以書面通知他方。若依送達地址所為之書面通知，發生送達不到或他方拒收之情形時，則以郵遞日視為送達。",
  `(六)匯款帳號：戶名「全偲行銷有限公司」，「彰化銀行-古亭分行」\n　　銀行代號「009」，帳號「5116-01-880888-00」`,
  "(七)付款方式: 每月執行前，甲方需先支付當月費用",
  "(八)甲方實際匯至乙方指定帳戶之金額，應為加計稅金後之金額，且匯款手續費由甲方承擔",
  "(九)報價單有效期限：超過7天回簽報價單，此報價單金額無效。",
  "(十)匯款時間：需14天內完成匯款",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "草稿",
  PENDING_APPROVAL: "待審核",
  APPROVED: "已核准",
  REJECTED: "已退回",
  CANCELLED: "已取消",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理員",
  FINANCE: "財務審核",
  SALES: "業務",
};
