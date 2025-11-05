'use server';

/**
 * @fileOverview This file defines a Genkit flow for optimizing appointment schedules based on historical data and predicted demand.
 *
 * The flow takes historical appointment data as input and returns a suggested appointment schedule.
 * It exports:
 * - `optimizeAppointmentSchedule`: The main function to trigger the flow.
 * - `OptimizeAppointmentScheduleInput`: The input type for the optimizeAppointmentSchedule function.
 * - `OptimizeAppointmentScheduleOutput`: The output type for the optimizeAppointmentSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeAppointmentScheduleInputSchema = z.object({
  historicalData: z.string().describe('Historical appointment data in JSON format.'),
  predictedDemand: z.string().describe('Predicted future demand in JSON format.'),
});

export type OptimizeAppointmentScheduleInput = z.infer<typeof OptimizeAppointmentScheduleInputSchema>;

const OptimizeAppointmentScheduleOutputSchema = z.object({
  suggestedSchedule: z.string().describe('Suggested appointment schedule in JSON format.'),
  explanation: z.string().describe('Explanation of how the schedule was optimized.'),
});

export type OptimizeAppointmentScheduleOutput = z.infer<typeof OptimizeAppointmentScheduleOutputSchema>;

export async function optimizeAppointmentSchedule(input: OptimizeAppointmentScheduleInput): Promise<OptimizeAppointmentScheduleOutput> {
  return optimizeAppointmentScheduleFlow(input);
}

const optimizeAppointmentSchedulePrompt = ai.definePrompt({
  name: 'optimizeAppointmentSchedulePrompt',
  input: {schema: OptimizeAppointmentScheduleInputSchema},
  output: {schema: OptimizeAppointmentScheduleOutputSchema},
  prompt: `You are an AI assistant that optimizes appointment schedules for museums.

  Analyze the following historical appointment data and predicted future demand to create an optimized appointment schedule.

  Historical Data: {{{historicalData}}}
  Predicted Demand: {{{predictedDemand}}}

  Based on this information, suggest an optimized appointment schedule, including how to allocate available appointment slots and resources.

  Ensure the suggested schedule maximizes resource utilization while meeting anticipated demand. Explain your reasoning for the suggested schedule.
  The output should be a JSON object containing the suggested schedule and explanation.
  `,
});

const optimizeAppointmentScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeAppointmentScheduleFlow',
    inputSchema: OptimizeAppointmentScheduleInputSchema,
    outputSchema: OptimizeAppointmentScheduleOutputSchema,
  },
  async input => {
    const {output} = await optimizeAppointmentSchedulePrompt(input);
    return output!;
  }
);
