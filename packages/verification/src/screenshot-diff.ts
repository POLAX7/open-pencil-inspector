import { readFile, stat, writeFile } from 'node:fs/promises';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type VerificationStatus = 'pass' | 'fail' | 'reference-unavailable' | 'reference-threshold-pending';

export interface ScreenshotVerification {
  status: VerificationStatus;
  referencePath: string;
  candidatePath: string;
  differenceRatio?: number;
  threshold?: number;
  diffPath?: string;
  message: string;
}

export async function verifyScreenshot(referencePath: string, candidatePath: string, threshold?: number, diffPath?: string): Promise<ScreenshotVerification> {
  const candidateExists = await stat(candidatePath).then(() => true, () => false);
  const referenceExists = await stat(referencePath).then(() => true, () => false);
  if (!referenceExists) return { status: 'reference-unavailable', referencePath, candidatePath, message: 'Reference screenshot is unavailable.' };
  if (!candidateExists) return { status: 'fail', referencePath, candidatePath, message: 'Candidate screenshot is unavailable.' };
  if (threshold === undefined) return { status: 'reference-threshold-pending', referencePath, candidatePath, message: 'Reference exists but no approved threshold was supplied.' };
  try {
    const reference = PNG.sync.read(await readFile(referencePath));
    const candidate = PNG.sync.read(await readFile(candidatePath));
    if (reference.width !== candidate.width || reference.height !== candidate.height) {
      return {
        status: 'fail', referencePath, candidatePath, differenceRatio: 1, threshold,
        message: `Screenshot dimensions differ: reference ${reference.width}x${reference.height}, candidate ${candidate.width}x${candidate.height}.`,
      };
    }
    const diff = new PNG({ width: reference.width, height: reference.height });
    const differentPixels = pixelmatch(reference.data, candidate.data, diff.data, reference.width, reference.height, { includeAA: true });
    const differenceRatio = differentPixels / (reference.width * reference.height);
    if (diffPath) await writeFile(diffPath, PNG.sync.write(diff));
    return { status: differenceRatio <= threshold ? 'pass' : 'fail', referencePath, candidatePath, differenceRatio, threshold, ...(diffPath ? { diffPath } : {}), message: `Difference ratio ${differenceRatio} compared with threshold ${threshold}.` };
  } catch (error) {
    return { status: 'fail', referencePath, candidatePath, threshold, message: `PNG comparison failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
