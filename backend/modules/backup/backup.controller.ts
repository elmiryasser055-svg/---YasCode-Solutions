// modules/backup/backup.controller.ts
// استعادة نسخة احتياطية تستبدل كل البيانات الحالية → owner فقط بلا استثناء

import { withValidation } from "../../middleware/ipcValidate";
import { requireAuth } from "../../middleware/ipcAuthGuard";
import { requireRole } from "../../middleware/ipcAuthorize";
import { restoreBackupSchema } from "./backup.schema";
import * as backupService from "./backup.service";

export const listBackupsController = requireAuth(
  requireRole(["owner"], async () => backupService.listAvailableBackups())
);

export const restoreBackupController = requireAuth(
  requireRole(["owner"], async (input) =>
    withValidation(restoreBackupSchema, (validInput) =>
      backupService.restoreFromBackup(validInput)
    )(input)
  )
);
