/** API 목록 응답 래퍼 */
export type ListResponse<T> = {
  data: T[];
  total: number;
};

/** API 단건 응답 래퍼 */
export type ItemResponse<T> = {
  data: T;
};

/** API 에러 응답 */
export type ApiError = {
  error: string;
  message?: string;
};
