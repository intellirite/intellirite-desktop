// Integration Test for Intellirite AI Engine
// Tests the complete pipeline from context gathering to patch generation

import { contextManager } from '../lib/context-manager';
import { parseFileReferences } from '../lib/reference-parser';
import { contextAssembler } from '../lib/context-assembler';
import { promptBuilder } from '../lib/prompt-builder';
import { aiClient } from '../lib/ai-client';
import { responseValidator } from '../lib/response-validator';
import { patchParser } from '../lib/patch-parser';
import { patchValidator } from '../lib/patch-validator';
import { patchProcessor } from '../lib/patch-processor';

// Sample test data
const sampleFileContent = `# Chapter 2: Introduction to AI

This chapter explores the fundamentals of artificial intelligence.

## What is AI?

Artificial intelligence is a field of computer science. It focuses on creating
intelligent machines. These machines can perform tasks that normally require
human intelligence.

## Types of AI

There are several types of AI:
- Narrow AI
- General AI
- Super AI

## Applications

AI has many applications in the modern world.
`;

const sampleSelection = `Artificial intelligence is a field of computer science. It focuses on creating
intelligent machines. These machines can perform tasks that normally require
human intelligence.`;

async function runIntegrationTest() {
    console.log('🧪 Intellirite AI Engine - Integration Test\n');
    console.log('='.repeat(60));

    try {
        // ========================================================================
        // STEP 1: Context Management
        // ========================================================================
        console.log('\n📋 STEP 1: Context Management');
        console.log('-'.repeat(60));

        const activeFile = contextManager.getCurrentFileContext(
            '/test/chapter2.md',
            'chapter2.md',
            sampleFileContent
        );

        console.log(`✓ Active file: ${activeFile.fileName}`);
        console.log(`  Lines: ${activeFile.lineCount}`);
        console.log(`  Extension: ${activeFile.extension}`);

        const selection = contextManager.getSelectionContextFromContent(
            sampleFileContent,
            sampleSelection,
            7,
            10
        );

        console.log(`✓ Selection: Lines ${selection.startLine}-${selection.endLine}`);
        console.log(`  Length: ${selection.text.length} characters`);

        // ========================================================================
        // STEP 2: Reference Parsing
        // ========================================================================
        console.log('\n📎 STEP 2: Reference Parsing');
        console.log('-'.repeat(60));

        const userMessage = "Rewrite this section to be more academic and formal.";
        const references = parseFileReferences(userMessage);

        console.log(`✓ Parsed ${references.length} file references`);
        if (references.length > 0) {
            references.forEach(ref => {
                console.log(`  - ${ref.original} → ${ref.fileName}`);
            });
        } else {
            console.log('  (No file references in this message)');
        }

        // ========================================================================
        // STEP 3: Context Assembly
        // ========================================================================
        console.log('\n🔧 STEP 3: Context Assembly');
        console.log('-'.repeat(60));

        const context = await contextAssembler.assembleContext({
            activeFile,
            selection,
            referencedFiles: [],
            chatHistory: [],
            userRequest: userMessage,
        });

        console.log(`✓ Context assembled`);
        console.log(`  Estimated tokens: ${context.estimatedTokens.toLocaleString()}`);
        console.log(`  Referenced files: ${context.referencedFiles.length}`);
        console.log(`  Chat history: ${context.chatHistory.length} messages`);

        const summary = contextAssembler.getContextSummary(context);
        console.log('\n' + summary);

        // ========================================================================
        // STEP 4: Prompt Building
        // ========================================================================
        console.log('\n📝 STEP 4: Prompt Building');
        console.log('-'.repeat(60));

        const taskType = promptBuilder.detectTaskType(userMessage);
        console.log(`✓ Detected task type: ${taskType}`);

        const prompt = promptBuilder.buildSystemPrompt(context, taskType);
        console.log(`✓ Prompt built: ${prompt.length} characters`);
        console.log(`  Preview: ${prompt.substring(0, 100)}...`);

        // ========================================================================
        // STEP 5: Model Selection
        // ========================================================================
        console.log('\n🤖 STEP 5: Model Selection');
        console.log('-'.repeat(60));

        const modelConfig = aiClient.selectModel(context);
        console.log(`✓ Selected model: ${modelConfig.modelName}`);
        console.log(`  Cost tier: ${modelConfig.costTier}`);
        console.log(`  Auto-selected: ${modelConfig.autoSelected}`);
        console.log(`  Reason: ${modelConfig.selectionReason}`);

        // ========================================================================
        // STEP 6: Simulated AI Response (Skip actual API call for test)
        // ========================================================================
        console.log('\n🔮 STEP 6: AI Response (Simulated)');
        console.log('-'.repeat(60));

        // Simulate a valid patch response
        const simulatedResponse = `<patch>
{
  "file": "chapter2.md",
  "type": "replace",
  "target": {
    "startLine": 7,
    "endLine": 10
  },
  "replacement": "Artificial intelligence represents a sophisticated domain within computer science, dedicated to the development of computational systems capable of executing tasks traditionally requiring human cognitive abilities. This encompasses reasoning, learning, problem-solving, and pattern recognition across diverse contexts."
}
</patch>`;

        console.log('✓ Simulated AI response received');
        console.log(`  Length: ${simulatedResponse.length} characters`);

        // ========================================================================
        // STEP 7: Response Validation
        // ========================================================================
        console.log('\n✅ STEP 7: Response Validation');
        console.log('-'.repeat(60));

        const validation = responseValidator.validateResponse(simulatedResponse);

        if (validation.isValid) {
            console.log('✓ Response is valid');
            console.log(`  Patches extracted: ${validation.patches!.length}`);

            if (validation.warnings.length > 0) {
                console.log(`  Warnings: ${validation.warnings.length}`);
                validation.warnings.forEach(w => console.log(`    - ${w}`));
            }
        } else {
            console.log('✗ Response is invalid');
            validation.errors.forEach(e => console.log(`  Error: ${e}`));
            throw new Error('Validation failed');
        }

        // ========================================================================
        // STEP 8: Patch Parsing
        // ========================================================================
        console.log('\n🔍 STEP 8: Patch Parsing');
        console.log('-'.repeat(60));

        const fileContents = new Map([
            ['chapter2.md', sampleFileContent],
        ]);

        const enrichedPatches = patchParser.parsePatches(
            validation.patches!,
            fileContents
        );

        console.log(`✓ Parsed ${enrichedPatches.length} patches`);
        enrichedPatches.forEach((patch, i) => {
            console.log(`\n  Patch ${i + 1}:`);
            console.log(`    File: ${patch.file}`);
            console.log(`    Type: ${patch.type}`);
            console.log(`    Valid: ${patch.isValid}`);
            console.log(`    Change: ${patch.changePercentage.toFixed(1)}%`);
            console.log(`    Size: ${patch.changeSize} chars`);

            if (patch.errors.length > 0) {
                console.log(`    Errors: ${patch.errors.join(', ')}`);
            }
        });

        // Check for conflicts
        const conflicts = patchParser.detectConflicts(enrichedPatches);
        console.log(`\n✓ Conflict detection: ${conflicts.length} conflicts found`);

        // ========================================================================
        // STEP 9: Safety Validation
        // ========================================================================
        console.log('\n🛡️  STEP 9: Safety Validation');
        console.log('-'.repeat(60));

        const validatedPatches = patchValidator.validatePatches(
            enrichedPatches,
            fileContents
        );

        const batchSafety = patchValidator.getBatchSafetyCheck(validatedPatches);

        console.log(`✓ Safety check complete`);
        console.log(`  Risk level: ${batchSafety.riskLevel.toUpperCase()}`);
        console.log(`  Safe: ${batchSafety.isSafe}`);
        console.log(`  Requires approval: ${batchSafety.requiresApproval}`);
        console.log(`  Recommendation: ${batchSafety.recommendation}`);

        if (batchSafety.reasons.length > 0) {
            console.log('  Reasons:');
            batchSafety.reasons.forEach(r => console.log(`    - ${r}`));
        }

        // ========================================================================
        // STEP 10: Diff Generation
        // ========================================================================
        console.log('\n📊 STEP 10: Diff Generation');
        console.log('-'.repeat(60));

        const processed = patchProcessor.processBatch(
            enrichedPatches,
            fileContents
        );

        processed.forEach(({ patch, diff, positions }) => {
            console.log(`\n✓ Diff for ${patch.file}:`);
            console.log(`  Statistics:`);
            console.log(`    +${diff.stats.additions} lines added`);
            console.log(`    -${diff.stats.deletions} lines removed`);
            console.log(`    ~${diff.stats.modifications} lines modified`);
            console.log(`  Editor positions:`);
            console.log(`    Lines: ${positions.startLine}-${positions.endLine}`);
            console.log(`    Offsets: ${positions.startOffset}-${positions.endOffset}`);
        });

        // Generate preview summary
        const summary2 = patchProcessor.generatePreviewSummary(
            enrichedPatches,
            fileContents
        );

        console.log(`\n✓ Preview summary:`);
        console.log(`  Total files: ${summary2.totalFiles}`);
        console.log(`  Total changes: ${summary2.totalChanges}`);

        // ========================================================================
        // FINAL SUMMARY
        // ========================================================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ INTEGRATION TEST COMPLETE');
        console.log('='.repeat(60));
        console.log('\nAll pipeline steps executed successfully!');
        console.log('\nPipeline verified:');
        console.log('  1. ✓ Context management');
        console.log('  2. ✓ Reference parsing');
        console.log('  3. ✓ Context assembly');
        console.log('  4. ✓ Prompt building');
        console.log('  5. ✓ Model selection');
        console.log('  6. ✓ AI response (simulated)');
        console.log('  7. ✓ Response validation');
        console.log('  8. ✓ Patch parsing');
        console.log('  9. ✓ Safety validation');
        console.log(' 10. ✓ Diff generation');
        console.log('\n🎉 The AI engine is ready for editor integration!\n');

        return true;

    } catch (error: any) {
        console.error('\n❌ TEST FAILED');
        console.error('-'.repeat(60));
        console.error(error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        return false;
    }
}

// Run the test
runIntegrationTest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
