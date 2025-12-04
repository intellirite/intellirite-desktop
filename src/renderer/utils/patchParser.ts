import { Patch } from '../components/PatchPreview';

/**
 * Parse AI response to extract patches
 * Handles both XML-wrapped patches and standalone JSON
 */
export function parseAIResponse(response: string): {
  hasPatches: boolean;
  patches: Patch[];
  textContent: string;
} {
  console.log('🔍 Parsing AI response:', response.substring(0, 200));
  
  // Try to extract patches from XML tags
  const patchMatches = response.match(/<patch>([\s\S]*?)<\/patch>/g);
  
  console.log('📦 Found patch matches:', patchMatches?.length || 0);
  
  if (!patchMatches || patchMatches.length === 0) {
    // No patches found - it's a regular text response
    console.log('ℹ️ No patches found in response');
    return {
      hasPatches: false,
      patches: [],
      textContent: response,
    };
  }

  const patches: Patch[] = [];
  let textContent = response;

  // Extract and parse each patch
  for (const match of patchMatches) {
    try {
      console.log('🔧 Processing patch:', match.substring(0, 100));
      
      // Remove XML tags and parse JSON
      const jsonStr = match.replace(/<\/?patch>/g, '').trim();
      const patchData = JSON.parse(jsonStr);

      console.log('✅ Parsed patch data:', patchData);

      // Validate and normalize patch
      if (isValidPatch(patchData)) {
        const normalized = normalizePatch(patchData);
        patches.push(normalized);
        console.log('✅ Added normalized patch:', normalized);
      } else {
        console.warn('⚠️ Invalid patch data:', patchData);
      }

      // Remove patch from text content
      textContent = textContent.replace(match, '').trim();
    } catch (error) {
      console.error('❌ Failed to parse patch:', error, match);
    }
  }

  console.log('📊 Parse complete:', {
    hasPatches: patches.length > 0,
    patchCount: patches.length,
    textContentLength: textContent.length
  });

  return {
    hasPatches: patches.length > 0,
    patches,
    textContent,
  };
}

/**
 * Validate patch structure
 */
function isValidPatch(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Must have file and type
  if (!data.file || !data.type) {
    return false;
  }

  // Validate type
  const validTypes = ['insert', 'replace', 'delete'];
  if (!validTypes.includes(data.type)) {
    return false;
  }

  // Type-specific validation
  switch (data.type) {
    case 'insert':
      return typeof data.line === 'number' && typeof data.content === 'string';
    
    case 'replace':
      return (
        data.target &&
        typeof data.target.startLine === 'number' &&
        typeof data.target.endLine === 'number' &&
        typeof data.replacement === 'string'
      );
    
    case 'delete':
      return (
        data.target &&
        typeof data.target.startLine === 'number' &&
        typeof data.target.endLine === 'number'
      );
    
    default:
      return false;
  }
}

/**
 * Normalize patch to consistent format
 */
function normalizePatch(data: any): Patch {
  return {
    file: String(data.file),
    type: data.type,
    line: data.line,
    target: data.target,
    content: data.content,
    replacement: data.replacement,
  };
}

/**
 * Apply a patch to file content
 */
export function applyPatch(fileContent: string, patch: Patch): string {
  const lines = fileContent.split('\n');

  switch (patch.type) {
    case 'insert': {
      const lineNum = patch.line || 1;
      const insertIndex = Math.max(0, Math.min(lineNum - 1, lines.length));
      const content = patch.content || '';
      
      lines.splice(insertIndex, 0, ...content.split('\n'));
      return lines.join('\n');
    }

    case 'replace': {
      if (!patch.target) {
        return fileContent;
      }

      const { startLine, endLine } = patch.target;
      const replacement = patch.replacement || '';
      const deleteCount = endLine - startLine + 1;
      
      lines.splice(startLine - 1, deleteCount, ...replacement.split('\n'));
      return lines.join('\n');
    }

    case 'delete': {
      if (!patch.target) {
        return fileContent;
      }

      const { startLine, endLine } = patch.target;
      const deleteCount = endLine - startLine + 1;
      
      lines.splice(startLine - 1, deleteCount);
      return lines.join('\n');
    }

    default:
      return fileContent;
  }
}

/**
 * Apply multiple patches in sequence
 */
export function applyPatches(fileContent: string, patches: Patch[]): string {
  let result = fileContent;
  
  for (const patch of patches) {
    result = applyPatch(result, patch);
  }
  
  return result;
}

