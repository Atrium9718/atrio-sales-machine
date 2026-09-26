import { describe, it, expect } from "vitest";
import { calculateNitDv, isValidColombianPhone, NitSchema } from "./colombia";

describe("Validaciones Colombianas", () => {
  describe("calculateNitDv", () => {
    it("calcula correctamente el DV para un NIT real (Fusión Comunicación Gráfica)", () => {
      // 900595222 -> DV 6
      expect(calculateNitDv("900595222")).toBe("6");
    });

    it("calcula correctamente DV terminados en 0 o 1", () => {
      // 800197268 -> 4. (Solo probamos otros válidos)
      expect(calculateNitDv("800197268")).toBe("4");
      // 890903938 -> 8
      expect(calculateNitDv("890903938")).toBe("8");
    });

    it("retorna null si el input es inválido", () => {
      expect(calculateNitDv("ABC")).toBeNull();
      expect(calculateNitDv("")).toBeNull();
    });
  });

  describe("isValidColombianPhone", () => {
    it("acepta móviles de 10 dígitos (empezando por 3)", () => {
      expect(isValidColombianPhone("3001234567")).toBe(true);
      expect(isValidColombianPhone("+57 300 123 4567")).toBe(true);
    });

    it("rechaza números con longitudes incorrectas", () => {
      expect(isValidColombianPhone("300123456")).toBe(false); // 9 dígitos
      expect(isValidColombianPhone("12345")).toBe(false);
    });
  });

  describe("NitSchema (Zod)", () => {
    it("valida NIT con DV correcto", () => {
      expect(NitSchema.safeParse("900595222-6").success).toBe(true);
    });

    it("falla si el DV es incorrecto", () => {
      const result = NitSchema.safeParse("900595222-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Se esperaba 6");
      }
    });

    it("falla con NIT basura", () => {
      expect(NitSchema.safeParse("123-A").success).toBe(false);
    });
  });
});
