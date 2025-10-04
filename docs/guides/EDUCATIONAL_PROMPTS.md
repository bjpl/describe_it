# Educational Prompt System Documentation

## Overview
This document outlines the educational prompt system for the Describe It Spanish learning application. All prompts are designed to maximize language learning outcomes through image-based content generation.

## Core Educational Philosophy

### 1. **Progressive Difficulty Levels**
- **Beginner (Infantil)**: A1-A2 CEFR level, basic vocabulary, simple structures
- **Intermediate (Conversacional)**: B1-B2 CEFR level, colloquial expressions, varied tenses
- **Advanced (Narrativo/Poético)**: B2-C1 CEFR level, complex structures, subjunctive mood
- **Academic (Académico)**: C1-C2 CEFR level, formal register, technical vocabulary

### 2. **Learning Objectives by Feature**

#### Image Descriptions
- **Primary Goal**: Expose learners to rich, contextual Spanish vocabulary
- **Secondary Goals**: 
  - Demonstrate grammar structures in natural context
  - Introduce cultural expressions and idioms
  - Build reading comprehension skills

#### Q&A Practice
- **Primary Goal**: Test comprehension and reinforce vocabulary
- **Secondary Goals**:
  - Practice question formation
  - Develop inferential thinking in Spanish
  - Strengthen grammar understanding

#### Vocabulary Extraction
- **Primary Goal**: Identify and categorize learnable words
- **Secondary Goals**:
  - Teach part-of-speech recognition
  - Build vocabulary acquisition strategies
  - Provide contextual learning

## Description Generation Prompts

### Style-Specific Educational Features

#### 1. Narrativo (Narrative) - Intermediate/Advanced
**Educational Focus**: Storytelling vocabulary and past tenses
```
Key Elements:
- Mixed verb tenses (preterite, imperfect, present perfect)
- Sequence connectors (primero, luego, después, finalmente)
- Emotion and action vocabulary
- 3-4 subjunctive constructions
- 10-15 target vocabulary items
```

#### 2. Poético (Poetic) - Advanced
**Educational Focus**: Figurative language and advanced structures
```
Key Elements:
- Metaphors and similes with context clues
- Sensory vocabulary (all five senses)
- Subjunctive mood expressions
- Literary devices explained through usage
- 5+ uncommon but useful adjectives
```

#### 3. Académico (Academic) - Advanced/Superior
**Educational Focus**: Formal register and technical vocabulary
```
Key Elements:
- Passive voice constructions
- Academic connectors (no obstante, asimismo)
- Technical terminology with contextual definitions
- Complex subordinate clauses
- Analysis and evaluation vocabulary
```

#### 4. Conversacional (Conversational) - Intermediate
**Educational Focus**: Daily communication and colloquialisms
```
Key Elements:
- Common idioms with clear context
- Filler words and discourse markers
- Present continuous and verbal periphrases
- 10+ everyday expressions
- Regional variations with explanations
```

#### 5. Infantil (Children's) - Beginner
**Educational Focus**: Foundation vocabulary and basic structures
```
Key Elements:
- High-frequency vocabulary
- Simple present and present continuous
- Basic comparisons
- Repetition for reinforcement
- Diminutives and augmentatives
```

## Q&A Generation System

### Question Types by Difficulty

#### Fácil (Easy) - Literal Comprehension
- **Question Starters**: ¿Qué...? ¿Cuántos...? ¿De qué color...? ¿Dónde...?
- **Focus**: Direct information from text
- **Example**: "¿Qué hay en la imagen?" → Tests basic vocabulary recall

#### Medio (Medium) - Inference and Analysis
- **Question Starters**: ¿Por qué...? ¿Cómo...? ¿Para qué...? ¿Cuál es la relación...?
- **Focus**: Understanding relationships and purpose
- **Example**: "¿Por qué crees que la persona está sonriendo?" → Tests inference skills

#### Difícil (Hard) - Hypothesis and Subjunctive
- **Question Starters**: ¿Qué pasaría si...? ¿Es posible que...? ¿Cómo sería si...?
- **Focus**: Complex grammar and abstract thinking
- **Example**: "¿Qué pasaría si los colores fueran diferentes?" → Tests subjunctive and conditional

### Question Categories

1. **Vocabulario**: Direct vocabulary questions
   - "¿Qué significa la palabra 'X' en el contexto?"
   - Tests: Word meaning in context

2. **Comprensión**: Factual understanding
   - "¿Cuántos elementos se describen?"
   - Tests: Reading for specific information

3. **Inferencia**: Reading between the lines
   - "¿Qué emoción transmite la escena?"
   - Tests: Contextual understanding

4. **Gramática**: Grammar-focused questions
   - "¿Por qué se usa el subjuntivo en esta frase?"
   - Tests: Grammar awareness

5. **Cultura**: Cultural elements
   - "¿Qué aspecto cultural se refleja?"
   - Tests: Cultural competence

## Vocabulary Extraction Algorithm

### Word Identification Patterns

#### Spanish Noun Patterns
```regex
/[oae]s?$|ción$|sión$|dad$|tad$|eza$|ura$|miento$|ancia$|encia$|aje$|ismo$|ista$/
```
Examples: información, libertad, conocimiento, paisaje

#### Spanish Verb Patterns
```regex
/ar$|er$|ir$|ando$|iendo$|ado$|ido$|ara$|iera$|ase$|iese$|are$|iere$/
```
Examples: caminar, corriendo, hablado, tuviera

#### Spanish Adjective Patterns
```regex
/oso$|osa$|ivo$|iva$|ante$|ente$|iente$|able$|ible$|al$|ico$|ica$/
```
Examples: hermoso, importante, increíble, tropical

#### Key Phrase Patterns
- Noun phrases: article + (adjective) + noun
- Verb phrases: auxiliary + main verb
- Prepositional phrases: preposition + article + noun

### Filtering System

#### Common Words to Exclude
- Articles: el, la, los, las, un, una
- Prepositions: de, en, a, con, para, por
- Conjunctions: y, o, pero, que, como
- Common verbs: ser, estar, hay, tener
- Pronouns: su, mi, tu, este, ese

#### Importance Scoring
1. Word frequency in text (2+ occurrences = important)
2. Word length (>4 characters for nouns/verbs, >6 for adverbs)
3. Context position (after articles = likely noun)

## Implementation Best Practices

### 1. Context is Key
- Always provide vocabulary with surrounding context
- Use the exact phrases from descriptions in Q&A
- Include example sentences in vocabulary definitions

### 2. Progressive Complexity
- Start with high-frequency vocabulary
- Gradually introduce complex structures
- Build on previously learned material

### 3. Cultural Integration
- Include culturally relevant vocabulary
- Explain regional variations
- Provide cultural context when appropriate

### 4. Error Tolerance
- Accept multiple correct answers in Q&A
- Provide constructive feedback
- Focus on communication over perfection

## Metrics for Success

### Vocabulary Coverage
- **Target**: 15-25 unique learnable words per description
- **Distribution**: 40% nouns, 25% verbs, 20% adjectives, 15% phrases

### Question Quality
- **Variety**: At least 2 difficulty levels per set
- **Categories**: Cover at least 3 different categories
- **Relevance**: 100% questions directly related to description content

### Learning Progression
- **Beginner**: 80% basic vocabulary, 20% intermediate
- **Intermediate**: 60% intermediate, 30% advanced, 10% basic
- **Advanced**: 70% advanced, 30% specialized/technical

## Future Enhancements

1. **Adaptive Difficulty**: Adjust based on user performance
2. **Spaced Repetition**: Track and reinforce weak vocabulary
3. **Grammar Progression**: Systematic grammar introduction
4. **Cultural Modules**: Dedicated cultural learning paths
5. **Regional Variations**: Spanish dialect options

## Testing Checklist

- [ ] Descriptions contain target vocabulary density
- [ ] Q&A questions match description content exactly
- [ ] Vocabulary extraction identifies 80%+ of learnable words
- [ ] Grammar structures are level-appropriate
- [ ] Cultural elements are accurately represented
- [ ] All content is educationally valuable
- [ ] Prompts generate consistent quality output

## Conclusion

This educational prompt system is designed to create a comprehensive Spanish learning experience through visual content. By carefully crafting prompts that balance linguistic complexity with pedagogical value, we ensure that every interaction contributes to language acquisition.

The system prioritizes:
1. **Contextual Learning**: Words and structures in meaningful contexts
2. **Progressive Difficulty**: Appropriate challenge for each level
3. **Active Engagement**: Interactive Q&A and vocabulary practice
4. **Cultural Competence**: Integration of cultural elements
5. **Practical Application**: Focus on usable, real-world Spanish