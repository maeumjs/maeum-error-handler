import executeHook from '#modules/executeHook';
import getErrorCode from '#modules/getErrorCode';
import getSchemaValidationError from '#modules/getSchemaValidationError';
import getSourceLocation from '#modules/getSourceLocation';
import { CE_MAEUM_DEFAULT_ERROR_HANDLER } from '#modules/interfaces/CE_MAEUM_DEFAULT_ERROR_HANDLER';
import { CE_MAEUM_ERROR_HANDLER_LOCALE } from '#modules/interfaces/CE_MAEUM_ERROR_HANDLER_LOCALE';
import type IMaeumValidationError from '#modules/interfaces/IMaeumValidationError';
import type TMaeumErrorHandlerHooks from '#modules/interfaces/TMaeumErrorHandlerHooks';
import type TMaeumErrorHandlerLocales from '#modules/interfaces/TMaeumErrorHandlerLocales';
import type TMaeumMessageIdHandles from '#modules/interfaces/TMaeumMessageIdHandles';
import type { ErrorObject } from 'ajv';
import type { FastifyReply, FastifyRequest } from 'fastify';
import httpStatusCodes from 'http-status-codes';

export default function schemaValidationHandler(
  err: Error & { validation?: ErrorObject[] },
  validation: ErrorObject[],
  req: FastifyRequest,
  reply: FastifyReply,
  options: {
    messageHandles?: TMaeumMessageIdHandles;
    locale: TMaeumErrorHandlerLocales;
    validationErrorReplyStringify: (data: unknown) => string;
    hooks?: TMaeumErrorHandlerHooks;
    encryptor?: (code: string) => string;
  },
) {
  executeHook({
    hooks: options.hooks,
    id: CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR,
    type: 'pre',
    err,
    req,
    reply,
  });

  const getMessageId =
    options.messageHandles?.[CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR] != null
      ? options.messageHandles[CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR]!
      : (id: string) => id;
  const schemaValidation = getSchemaValidationError(validation);
  const code = getErrorCode(err);
  const sourceLocation = getSourceLocation(
    err,
    'P01:14152B97535A4F03B966F88417DEC63E',
    options.encryptor,
  );

  const getValidationErrorData = () => {
    if (code == null) {
      const data: IMaeumValidationError = {
        code: sourceLocation,
        message:
          options.locale[CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR]?.(
            req,
            getMessageId(CE_MAEUM_ERROR_HANDLER_LOCALE.BAD_REQUEST),
          ) ?? 'invalid request parameter',
        validation: schemaValidation,
      };

      return data;
    }

    if ('data' in err && err.data != null && typeof err.data === 'object') {
      const data: IMaeumValidationError & { data: unknown } = {
        code,
        message:
          options.locale[CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR]?.(
            req,
            getMessageId(CE_MAEUM_ERROR_HANDLER_LOCALE.BAD_REQUEST),
          ) ?? 'invalid request parameter',
        validation: schemaValidation,
        data: { ...err.data, source: sourceLocation },
      };

      return data;
    }

    const data: IMaeumValidationError & { data?: string } = {
      code,
      validation: schemaValidation,
      message:
        options.locale[CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR]?.(
          req,
          getMessageId(CE_MAEUM_ERROR_HANDLER_LOCALE.BAD_REQUEST),
        ) ?? 'invalid request parameter',
      data: sourceLocation,
    };

    return data;
  };

  const data: IMaeumValidationError = getValidationErrorData();
  const serialized = options.validationErrorReplyStringify(data);

  executeHook({
    hooks: options.hooks,
    id: CE_MAEUM_DEFAULT_ERROR_HANDLER.DEFAULT_SCHEMA_VALIDATION_ERROR,
    type: 'post',
    err,
    req,
    reply,
  });

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  reply.code(httpStatusCodes.BAD_REQUEST).send(serialized);
}