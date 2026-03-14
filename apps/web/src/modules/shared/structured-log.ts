type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function toSerializableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

function writeStructuredLog(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logAuthFailure(reason: string, context: LogContext = {}) {
  writeStructuredLog("warn", "auth.failure", {
    reason,
    ...context,
  });
}

export function logOwnershipDenied(resourceType: string, resourceId: string, guardianUserId: string) {
  writeStructuredLog("warn", "auth.ownership_denied", {
    resourceType,
    resourceId,
    guardianUserId,
  });
}

export function logAccessDenied(reason: string, context: LogContext = {}) {
  writeStructuredLog("warn", "auth.access_denied", {
    reason,
    ...context,
  });
}

export function logInviteFailure(reason: string, context: LogContext = {}) {
  writeStructuredLog("warn", "invite.failure", {
    reason,
    ...context,
  });
}

export function logUploadFailure(reason: string, context: LogContext = {}) {
  writeStructuredLog("warn", "upload.failure", {
    reason,
    ...context,
  });
}

export function logUnexpectedError(event: string, error: unknown, context: LogContext = {}) {
  writeStructuredLog("error", event, {
    ...context,
    error: toSerializableError(error),
  });
}
