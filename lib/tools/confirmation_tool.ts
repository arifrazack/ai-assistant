export interface ConfirmationRequest {
  tool: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  missingParameters?: string[];
}

export interface ConfirmationResponse {
  action: 'approve' | 'edit' | 'deny';
  editedParameters?: Record<string, any>;
}

// Communication tools that require user confirmation before execution
const COMMUNICATION_TOOLS = [
  'send_imessage',
  'gmail_send_email',
  'start_facetime_call'
];

export function requiresConfirmation(toolName: string): boolean {
  return COMMUNICATION_TOOLS.includes(toolName);
}

export function validateParameters(toolName: string, parameters: Record<string, any>): { valid: boolean; missing: string[] } {
  const required: Record<string, string[]> = {
    'send_imessage': ['contact_name', 'message'],
    'gmail_send_email': ['to', 'subject', 'body'],
    'start_facetime_call': ['contact_name']
  };

  const requiredFields = required[toolName] || [];
  const missing = requiredFields.filter(field => !parameters[field] || !parameters[field].toString().trim());
  
  return {
    valid: missing.length === 0,
    missing
  };
}

export async function createConfirmationRequest(toolName: string, parameters: Record<string, any>): Promise<ConfirmationRequest> {
  const validation = validateParameters(toolName, parameters);
  
  return {
    tool: toolName,
    parameters,
    requiresConfirmation: true,
    missingParameters: validation.missing
  };
} 