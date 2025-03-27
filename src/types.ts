/**
 * TypeScript definitions for HaloPSA Workflow API objects
 * Based on the HaloPSA API documentation and schema
 */

/**
 * Represents a step in a workflow target
 */
export interface WorkflowTargetStep {
  id: number;
  workflowtarget_id: number;
  step_id: number;
  is_end?: boolean | null;
  name?: string | null;
  flowheader_id?: number | null;
  _warning?: string | null;
}

/**
 * Represents a workflow history record
 */
export interface WorkflowHistory {
  id: number;
  ticket_id?: number | null;
  moved_from?: number | null;
  moved_to?: number | null;
  flow_id?: number | null;
  moved_from_stage?: number | null;
  moved_to_stage?: number | null;
  moved_date?: string | null;
  target_date?: string | null;
  target_hours?: number | null;
  actual_hours?: number | null;
  target_met?: boolean | null;
  override_date?: string | null;
  summary?: string | null;
  action_id?: number | null;
}

/**
 * Represents an auto-assign rule
 * Note: This interface is referenced but not fully defined in the provided schema
 */
export interface Autoassign {
  id: number;
  [key: string]: any;
}

/**
 * Represents a workflow target
 */
export interface WorkflowTarget {
  id: number;
  name?: string | null;
  flow_id?: number | null;
  flow_guid?: string | null;
  target_type?: number | null;
  start_stage_id?: number | null;
  start_stage_name?: string | null;
  end_stage_id?: number | null;
  end_stage_name?: string | null;
  start_steps?: WorkflowTargetStep[] | null;
  end_steps?: WorkflowTargetStep[] | null;
  target?: number | null;
  target_units?: string | null;
  workday?: number | null;
  workday_name?: string | null;
  rules?: Autoassign[] | null;
  rule_id?: number | null;
  _warning?: string | null;
}

/**
 * Represents a workflow header
 */
export interface FlowHeader {
  id: number;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  color?: string | null;
  // Add additional properties as needed based on API responses
  [key: string]: any;
}

/**
 * Represents a workflow detail/step
 */
export interface FlowDetail {
  id: number;
  flowheader_id?: number | null;
  name?: string | null;
  step_type?: number | null;
  description?: string | null;
  // Add additional properties as needed based on API responses
  [key: string]: any;
}

/**
 * Authentication token response from HaloPSA API
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

/**
 * Error response from HaloPSA API
 */
export interface ApiErrorResponse {
  error?: string;
  error_description?: string;
  message?: string;
  status?: number;
  [key: string]: any;
}
