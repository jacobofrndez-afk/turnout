import { z } from "zod";
export const LocalPromotionSchema=z.object({platform:z.enum(["facebook","instagram"]),radiusKm:z.number().min(1).max(10)});
export type LocalPromotion=z.infer<typeof LocalPromotionSchema>;
export type SavedLocalPromotion=LocalPromotion & {center:{name:string;lat:number;lon:number};status:"draft"};
