export interface AgentTemplate {
  _id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  skills: string[];
  estimatedCostPer1kTokens: number;
}
