import { userMessages } from "@/lib/user-messages";

export const MAX_INPUT_CHARS = Number(process.env.MAX_INPUT_CHARS || 8000);

export function validateInputLength(
  resume: string,
  jd: string
): { ok: true } | { ok: false; message: string } {
  const rTooLong = resume.length > MAX_INPUT_CHARS;
  const jTooLong = jd.length > MAX_INPUT_CHARS;
  if (rTooLong && jTooLong) return { ok: false, message: userMessages.tooLongBoth };
  if (rTooLong) return { ok: false, message: userMessages.tooLongResume };
  if (jTooLong) return { ok: false, message: userMessages.tooLongJd };
  return { ok: true };
}
