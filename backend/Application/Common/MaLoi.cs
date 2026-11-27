namespace CampusExam.Application.Common;

/// <summary>
/// Mã lỗi ổn định trả trong trường <c>code</c> của ProblemDetails. Frontend rẽ nhánh theo
/// các mã này, nên chỉ được thêm mới, không đổi tên mã đã phát hành.
/// </summary>
public static class MaLoi
{
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string Forbidden = "FORBIDDEN";
    public const string RateLimited = "RATE_LIMITED";

    public const string AuthUnauthenticated = "AUTH_UNAUTHENTICATED";
    public const string AuthTokenExpired = "AUTH_TOKEN_EXPIRED";
    public const string AuthInvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string AuthAccountLocked = "AUTH_ACCOUNT_LOCKED";
    public const string AuthAccountDisabled = "AUTH_ACCOUNT_DISABLED";
    public const string AuthRefreshInvalid = "AUTH_REFRESH_INVALID";
    public const string AuthCsrfFailed = "AUTH_CSRF_FAILED";
    public const string AuthCurrentPasswordIncorrect = "AUTH_CURRENT_PASSWORD_INCORRECT";

    public const string KqhtNotFound = "KQHT_NOT_FOUND";
    public const string KqhtKyHieuConflict = "KQHT_KY_HIEU_CONFLICT";
    public const string KqhtInUse = "KQHT_IN_USE";
    public const string KqhtInactive = "KQHT_INACTIVE";

    public const string QuestionNotFound = "QUESTION_NOT_FOUND";
    public const string QuestionInUse = "QUESTION_IN_USE";

    public const string MatrixNotFound = "MATRIX_NOT_FOUND";
    public const string MatrixInUse = "MATRIX_IN_USE";
    public const string MatrixNotEditable = "MATRIX_NOT_EDITABLE";
    public const string MatrixNotReady = "MATRIX_NOT_READY";

    public const string PaperNotFound = "PAPER_NOT_FOUND";
    public const string PaperInUse = "PAPER_IN_USE";
    public const string PaperCodeConflict = "PAPER_CODE_CONFLICT";
    public const string PaperPermutationsExhausted = "PAPER_PERMUTATIONS_EXHAUSTED";

    public const string ExamNotFound = "EXAM_NOT_FOUND";
    public const string ExamInvalidState = "EXAM_INVALID_STATE";
    public const string ExamNotReady = "EXAM_NOT_READY";
    public const string ExamStudentStarted = "EXAM_STUDENT_STARTED";
    public const string ExamAssignmentNotFound = "EXAM_ASSIGNMENT_NOT_FOUND";
    public const string ExamNotOpen = "EXAM_NOT_OPEN";
    public const string AttemptNotFound = "ATTEMPT_NOT_FOUND";
    public const string AttemptClosed = "ATTEMPT_CLOSED";
    public const string ExamNoResults = "EXAM_NO_RESULTS";

    public const string ConcurrencyConflict = "CONCURRENCY_CONFLICT";

    public const string StudentNotFound = "STUDENT_NOT_FOUND";
    public const string StudentMstsConflict = "STUDENT_MSTS_CONFLICT";
    public const string StudentCccdConflict = "STUDENT_CCCD_CONFLICT";
    public const string StudentInUse = "STUDENT_IN_USE";

    public const string QuestionImportEmptyFile = "QUESTION_IMPORT_EMPTY_FILE";
    public const string QuestionImportFileTooLarge = "QUESTION_IMPORT_FILE_TOO_LARGE";
    public const string QuestionImportUnsupportedFileType = "QUESTION_IMPORT_UNSUPPORTED_FILE_TYPE";
    public const string QuestionImportInvalidFile = "QUESTION_IMPORT_INVALID_FILE";
    public const string QuestionImportHasErrors = "QUESTION_IMPORT_HAS_ERRORS";
    public const string StudentImportEmptyFile = "STUDENT_IMPORT_EMPTY_FILE";
    public const string StudentImportFileTooLarge = "STUDENT_IMPORT_FILE_TOO_LARGE";
    public const string StudentImportUnsupportedFileType = "STUDENT_IMPORT_UNSUPPORTED_FILE_TYPE";
    public const string StudentImportInvalidFile = "STUDENT_IMPORT_INVALID_FILE";
    public const string StudentImportHasErrors = "STUDENT_IMPORT_HAS_ERRORS";
    public const string ImportPreviewNotFound = "IMPORT_PREVIEW_NOT_FOUND";
    public const string ImportPreviewExpired = "IMPORT_PREVIEW_EXPIRED";
    public const string QuestionMediaNotFound = "QUESTION_MEDIA_NOT_FOUND";
}
