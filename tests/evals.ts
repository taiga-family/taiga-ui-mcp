import {groq} from '@ai-sdk/groq';
import {type EvalConfig, type EvalFunction, grade} from 'mcp-evals';

const taigaUIEval: EvalFunction = {
    name: 'Taiga UI Tool Evaluation',
    description: 'Evaluates Taiga UI component generation',
    run: async () => {
        const result = await grade(
            groq('llama-3.3-70b-versatile'),
            'Generate Taiga UI login form component. Return only JSON format like {"accuracy": 0, "completeness": 0, "relevance": 0, "clarity": 0, "reasoning": 0, "overall_comments": "..." }',
        );

        return JSON.parse(result);
    },
};

const config: EvalConfig = {
    model: groq('llama-3.3-70b-versatile'),
    evals: [taigaUIEval],
};

export default config;

export const evals = [taigaUIEval];
