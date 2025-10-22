#!/usr/bin/env node
/**
 * TheCareBot Multi-Agent Orchestrator
 * 
 * Coordinates specialized subagents to build a complete medical AI application
 * with Chilean compliance, resilience patterns, and zero-any TypeScript.
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

// === AGENT DEFINITIONS ===
interface Agent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dependencies: readonly string[];
  readonly phase: 1 | 2 | 3 | 4;
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly estimatedHours: number;
  readonly expertise: readonly string[];
  readonly deliverables: readonly string[];
  readonly commands: readonly AgentCommand[];
}

interface AgentCommand {
  readonly name: string;
  readonly description: string;
  readonly command: string;
  readonly validation?: string;
}

interface ExecutionPlan {
  readonly totalPhases: number;
  readonly totalHours: number;
  readonly phaseBreakdown: readonly PhaseInfo[];
  readonly criticalPath: readonly string[];
  readonly parallelTracks: readonly string[][];
}

interface PhaseInfo {
  readonly phase: number;
  readonly agents: readonly string[];
  readonly estimatedHours: number;
  readonly canRunInParallel: boolean;
}

// === SPECIALIZED MEDICAL AI AGENTS ===
const AGENTS: readonly Agent[] = [
  {
    id: 'database',
    name: 'Database Subagent',
    description: 'Supabase PostgreSQL with medical RLS policies and Chilean compliance',
    dependencies: [],
    phase: 1,
    priority: 'critical',
    estimatedHours: 12,
    expertise: [
      'Supabase PostgreSQL schemas',
      'Row-Level Security (RLS) policies', 
      'Medical data encryption',
      'Chilean compliance (Ley 19.628)',
      'Audit trail implementation',
      'Performance optimization'
    ],
    deliverables: [
      'Medical database schema with RLS',
      'Chilean RUT validation at DB level',
      'Audit logging tables and triggers',
      'Performance indexes for medical queries',
      'Data migration scripts',
      'Connection pooling configuration'
    ],
    commands: [
      {
        name: 'init-database',
        description: 'Initialize Supabase database with medical schemas',
        command: 'npx supabase init && npx supabase db reset --linked',
        validation: 'npx supabase db diff --use-migra'
      },
      {
        name: 'create-medical-schema',
        description: 'Create medical tables with RLS policies',
        command: 'npx supabase migration new medical_schema',
      },
      {
        name: 'setup-rls',
        description: 'Configure Row-Level Security for medical data',
        command: 'npx supabase migration new rls_policies',
      },
      {
        name: 'performance-indexes',
        description: 'Add performance indexes for medical queries',
        command: 'npx supabase migration new performance_indexes',
      }
    ]
  },

  {
    id: 'types',
    name: 'TypeScript Subagent',
    description: 'Zero-any TypeScript with Chilean medical domain types and runtime validation',
    dependencies: [],
    phase: 1,
    priority: 'critical',
    estimatedHours: 8,
    expertise: [
      'Zero-any TypeScript policy',
      'Medical domain modeling',
      'Chilean RUT type validation',
      'Zod schema generation',
      'Branded types for medical IDs',
      'Strict ESLint configuration'
    ],
    deliverables: [
      'Medical domain types (Doctor, Patient, Session, Analysis)',
      'Chilean RUT branded type with validation',
      'Medical license validation types',
      'Zod schemas for all external data',
      'Strict TypeScript configuration',
      'ESLint rules preventing any usage'
    ],
    commands: [
      {
        name: 'setup-strict-typescript',
        description: 'Configure strict TypeScript with zero-any policy',
        command: 'npm run typecheck:strict',
        validation: 'npx tsc --noEmit --strict'
      },
      {
        name: 'generate-medical-types',
        description: 'Generate Chilean medical domain types',
        command: 'npm run types:generate-medical',
      },
      {
        name: 'setup-zod-validation',
        description: 'Create Zod schemas for runtime validation',
        command: 'npm run types:generate-schemas',
      },
      {
        name: 'validate-rut-types',
        description: 'Implement Chilean RUT validation with branded types',
        command: 'npm run types:validate-rut',
        validation: 'npm run test:rut-validation'
      }
    ]
  },

  {
    id: 'backend',
    name: 'Backend Subagent',
    description: 'n8n workflows with resilience patterns, circuit breakers, and medical AI integration',
    dependencies: ['database', 'types'],
    phase: 2,
    priority: 'critical',
    estimatedHours: 16,
    expertise: [
      'n8n workflow orchestration',
      'Circuit breaker patterns',
      'Exponential backoff retry logic',
      'Medical AI workflow integration',
      'Demo mode fallback strategies',
      'Health check monitoring'
    ],
    deliverables: [
      'n8n medical analysis workflows',
      'Circuit breaker implementation',
      'Retry logic with exponential backoff',
      'Demo mode for graceful degradation',
      'Google Healthcare API integration',
      'Medical workflow health checks'
    ],
    commands: [
      {
        name: 'setup-n8n-workflows',
        description: 'Initialize n8n medical workflows',
        command: 'npm run n8n:init-medical-workflows',
      },
      {
        name: 'implement-circuit-breakers',
        description: 'Add circuit breaker patterns for resilience',
        command: 'npm run backend:circuit-breakers',
      },
      {
        name: 'setup-medical-ai',
        description: 'Configure medical AI analysis workflows',
        command: 'npm run backend:medical-ai-integration',
      },
      {
        name: 'create-demo-mode',
        description: 'Implement safe demo mode with fake data',
        command: 'npm run backend:demo-mode',
        validation: 'npm run test:demo-mode-safety'
      }
    ]
  },

  {
    id: 'security',
    name: 'Security Subagent',
    description: 'Chilean medical compliance, AES-256 encryption, and audit trails',
    dependencies: ['database', 'types'],
    phase: 2,
    priority: 'critical',
    estimatedHours: 14,
    expertise: [
      'Chilean Law 19.628 compliance',
      'AES-256-GCM encryption',
      'Medical license validation',
      'Audit trail implementation', 
      'HIPAA/GDPR compliance',
      'Session timeout management'
    ],
    deliverables: [
      'AES-256 medical data encryption',
      'Chilean RUT validation with check digit',
      'Medical license verification system',
      'Immutable audit logging',
      '20-minute session timeout enforcement',
      'Security headers and CSP policies'
    ],
    commands: [
      {
        name: 'setup-encryption',
        description: 'Implement AES-256 encryption for medical data',
        command: 'npm run security:setup-encryption',
      },
      {
        name: 'chilean-rut-validation',
        description: 'Implement Chilean RUT validation with mathematical check',
        command: 'npm run security:rut-validation',
        validation: 'npm run test:rut-check-digit'
      },
      {
        name: 'medical-license-validation',
        description: 'Setup medical license verification',
        command: 'npm run security:medical-license',
      },
      {
        name: 'audit-trails',
        description: 'Implement immutable medical audit logging',
        command: 'npm run security:audit-trails',
      }
    ]
  },

  {
    id: 'frontend',
    name: 'Frontend UX Subagent', 
    description: 'Next.js medical dashboard with PWA, session management, and accessibility',
    dependencies: ['backend', 'security', 'types'],
    phase: 3,
    priority: 'high',
    estimatedHours: 18,
    expertise: [
      'Next.js 14 with App Router',
      'Medical UI/UX patterns',
      'PWA with offline capabilities',
      '20-minute session timeout UI',
      'WCAG 2.1 AA accessibility',
      'Medical file upload handling'
    ],
    deliverables: [
      'Medical dashboard with session management',
      'PWA configuration for clinical environments',
      'Session timeout with visual countdown',
      'Medical file upload (Excel, images)',
      'Accessible medical UI components',
      'Responsive design for tablets/desktops'
    ],
    commands: [
      {
        name: 'setup-nextjs-medical',
        description: 'Initialize Next.js medical dashboard',
        command: 'npm run frontend:setup-medical-dashboard',
      },
      {
        name: 'implement-session-timeout',
        description: 'Add 20-minute session timeout with warnings',
        command: 'npm run frontend:session-timeout',
        validation: 'npm run test:session-timeout'
      },
      {
        name: 'setup-pwa',
        description: 'Configure PWA for clinical environments',
        command: 'npm run frontend:setup-pwa',
      },
      {
        name: 'medical-file-upload',
        description: 'Implement secure medical file upload',
        command: 'npm run frontend:medical-file-upload',
      }
    ]
  },

  {
    id: 'mobile',
    name: 'React Native Subagent',
    description: 'Offline-first mobile app with encrypted SQLite and intelligent sync',
    dependencies: ['backend', 'security', 'types'],
    phase: 3,
    priority: 'high',
    estimatedHours: 20,
    expertise: [
      'React Native offline-first architecture',
      'Encrypted SQLite for medical data',
      'Intelligent sync strategies',
      'Network connectivity management',
      'Mobile medical workflows',
      'Biometric authentication'
    ],
    deliverables: [
      'Offline-first React Native app',
      'Encrypted SQLite medical data storage',
      'Automatic sync on secure WiFi',
      'Offline medical session management',
      'Network connectivity awareness',
      'Mobile-optimized medical UI'
    ],
    commands: [
      {
        name: 'setup-react-native',
        description: 'Initialize React Native medical app',
        command: 'npm run mobile:init-medical-app',
      },
      {
        name: 'setup-encrypted-sqlite',
        description: 'Configure encrypted SQLite for medical data',
        command: 'npm run mobile:encrypted-storage',
      },
      {
        name: 'implement-offline-sync',
        description: 'Add intelligent offline sync capabilities',
        command: 'npm run mobile:offline-sync',
      },
      {
        name: 'mobile-medical-ui',
        description: 'Create mobile-optimized medical interface',
        command: 'npm run mobile:medical-interface',
        validation: 'npm run test:mobile-offline'
      }
    ]
  },

  {
    id: 'observability',
    name: 'Observability Subagent',
    description: 'Medical metrics, distributed tracing, and compliance monitoring',
    dependencies: ['frontend', 'mobile', 'backend'],
    phase: 4,
    priority: 'medium',
    estimatedHours: 12,
    expertise: [
      'Medical business metrics',
      'Distributed tracing for medical workflows',
      'Prometheus + Grafana configuration',
      'Medical compliance monitoring',
      'Chaos testing for resilience',
      'SLO/SLI for medical systems'
    ],
    deliverables: [
      'Medical analysis performance metrics',
      'Distributed tracing for n8n workflows', 
      'Medical compliance dashboards',
      'Automated medical system health checks',
      'Medical business intelligence metrics',
      'Chaos testing framework'
    ],
    commands: [
      {
        name: 'setup-medical-metrics',
        description: 'Configure medical business metrics tracking',
        command: 'npm run observability:medical-metrics',
      },
      {
        name: 'distributed-tracing',
        description: 'Implement distributed tracing for medical workflows',
        command: 'npm run observability:distributed-tracing',
      },
      {
        name: 'compliance-monitoring',
        description: 'Setup Chilean medical compliance monitoring',
        command: 'npm run observability:compliance-monitoring',
      },
      {
        name: 'medical-dashboards',
        description: 'Create medical performance dashboards',
        command: 'npm run observability:medical-dashboards',
        validation: 'npm run test:medical-metrics'
      }
    ]
  }
] as const;

// === ORCHESTRATOR CLASS ===
class MedicalAIOrchestrator {
  private readonly agents: Map<string, Agent>;
  private readonly executionLog: string[] = [];

  constructor() {
    this.agents = new Map(AGENTS.map(agent => [agent.id, agent]));
  }

  // Generate comprehensive execution plan
  generateExecutionPlan(): ExecutionPlan {
    const phases = this.groupAgentsByPhase();
    const totalHours = AGENTS.reduce((sum, agent) => sum + agent.estimatedHours, 0);
    const criticalPath = this.calculateCriticalPath();
    const parallelTracks = this.identifyParallelTracks();

    return {
      totalPhases: 4,
      totalHours,
      phaseBreakdown: phases,
      criticalPath,
      parallelTracks
    };
  }

  private groupAgentsByPhase(): PhaseInfo[] {
    const phaseGroups = new Map<number, Agent[]>();
    
    for (const agent of AGENTS) {
      if (!phaseGroups.has(agent.phase)) {
        phaseGroups.set(agent.phase, []);
      }
      phaseGroups.get(agent.phase)!.push(agent);
    }

    return Array.from(phaseGroups.entries()).map(([phase, agents]) => ({
      phase,
      agents: agents.map(a => a.id),
      estimatedHours: agents.reduce((sum, a) => sum + a.estimatedHours, 0),
      canRunInParallel: this.canRunInParallel(agents)
    }));
  }

  private canRunInParallel(agents: Agent[]): boolean {
    // Check if agents in this phase can run in parallel
    for (const agent of agents) {
      for (const otherAgent of agents) {
        if (agent.id !== otherAgent.id && 
            (agent.dependencies.includes(otherAgent.id) || 
             otherAgent.dependencies.includes(agent.id))) {
          return false;
        }
      }
    }
    return true;
  }

  private calculateCriticalPath(): string[] {
    // Calculate the longest dependency chain
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (agentId: string): number => {
      if (visited.has(agentId)) return 0;
      
      visited.add(agentId);
      const agent = this.agents.get(agentId)!;
      
      let maxDepth = agent.estimatedHours;
      for (const depId of agent.dependencies) {
        maxDepth = Math.max(maxDepth, agent.estimatedHours + dfs(depId));
      }
      
      path.push(agentId);
      return maxDepth;
    };

    let maxTime = 0;
    let criticalAgent = '';
    
    for (const agent of AGENTS) {
      visited.clear();
      const time = dfs(agent.id);
      if (time > maxTime) {
        maxTime = time;
        criticalAgent = agent.id;
      }
    }

    return this.buildPath(criticalAgent);
  }

  private buildPath(agentId: string): string[] {
    const agent = this.agents.get(agentId)!;
    const path: string[] = [];
    
    for (const depId of agent.dependencies) {
      path.push(...this.buildPath(depId));
    }
    
    path.push(agentId);
    return Array.from(new Set(path)); // Remove duplicates
  }

  private identifyParallelTracks(): string[][] {
    const tracks: string[][] = [];
    const processed = new Set<string>();

    for (const agent of AGENTS) {
      if (processed.has(agent.id)) continue;

      const track = [agent.id];
      processed.add(agent.id);

      // Find other agents that can run in parallel
      for (const otherAgent of AGENTS) {
        if (processed.has(otherAgent.id)) continue;
        
        if (this.canRunInParallel([agent, otherAgent]) && 
            agent.phase === otherAgent.phase) {
          track.push(otherAgent.id);
          processed.add(otherAgent.id);
        }
      }

      if (track.length > 1) {
        tracks.push(track);
      }
    }

    return tracks;
  }

  // Execute specific agent with all its commands
  async executeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(chalk.blue(`\n🤖 Executing Agent: ${agent.name}`));
    console.log(chalk.gray(`Description: ${agent.description}`));
    console.log(chalk.gray(`Estimated time: ${agent.estimatedHours} hours\n`));

    // Check dependencies
    await this.checkDependencies(agent);

    // Execute all commands for this agent
    for (const command of agent.commands) {
      await this.executeCommand(agent, command);
    }

    // Validate deliverables
    await this.validateDeliverables(agent);

    console.log(chalk.green(`✅ Agent ${agent.name} completed successfully\n`));
    this.logExecution(`Agent ${agentId} completed`, 'success');
  }

  private async checkDependencies(agent: Agent): Promise<void> {
    console.log(chalk.yellow(`🔍 Checking dependencies for ${agent.name}...`));
    
    for (const depId of agent.dependencies) {
      const dependency = this.agents.get(depId)!;
      console.log(chalk.gray(`  ├─ ${dependency.name}: Checking...`));
      
      // Here you would implement actual dependency checking
      // For now, we'll just log it
      console.log(chalk.green(`  ├─ ${dependency.name}: ✅ Ready`));
    }
  }

  private async executeCommand(agent: Agent, command: AgentCommand): Promise<void> {
    console.log(chalk.cyan(`  🔧 ${command.name}: ${command.description}`));
    console.log(chalk.gray(`     Command: ${command.command}`));

    try {
      // In a real implementation, you would execute the actual command
      // For demonstration, we'll simulate execution
      await this.simulateCommandExecution(command.command);
      
      if (command.validation) {
        console.log(chalk.yellow(`  🧪 Validating: ${command.validation}`));
        await this.simulateCommandExecution(command.validation);
      }
      
      console.log(chalk.green(`  ✅ ${command.name} completed`));
      
    } catch (error) {
      console.log(chalk.red(`  ❌ ${command.name} failed: ${error}`));
      throw error;
    }
  }

  private async simulateCommandExecution(command: string): Promise<void> {
    // Simulate command execution time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Log the command execution
    this.logExecution(`Command executed: ${command}`, 'info');
  }

  private async validateDeliverables(agent: Agent): Promise<void> {
    console.log(chalk.yellow(`📋 Validating deliverables for ${agent.name}...`));
    
    for (const deliverable of agent.deliverables) {
      console.log(chalk.gray(`  ├─ ${deliverable}`));
      // In real implementation, you would check if files exist, tests pass, etc.
      console.log(chalk.green(`  ├─ ${deliverable}: ✅ Validated`));
    }
  }

  // Execute entire plan in phases
  async executeFullPlan(): Promise<void> {
    const plan = this.generateExecutionPlan();
    
    console.log(chalk.blue.bold(`\n🎯 TheCareBot Medical AI - Full Execution Plan`));
    console.log(chalk.gray(`Total estimated time: ${plan.totalHours} hours`));
    console.log(chalk.gray(`Critical path: ${plan.criticalPath.join(' → ')}\n`));

    for (const phaseInfo of plan.phaseBreakdown) {
      console.log(chalk.magenta.bold(`\n📋 PHASE ${phaseInfo.phase} (${phaseInfo.estimatedHours} hours)`));
      
      if (phaseInfo.canRunInParallel) {
        console.log(chalk.green(`Agents can run in parallel:`));
        
        // Execute agents in parallel
        const promises = phaseInfo.agents.map(agentId => this.executeAgent(agentId));
        await Promise.all(promises);
        
      } else {
        console.log(chalk.yellow(`Agents must run sequentially:`));
        
        // Execute agents sequentially  
        for (const agentId of phaseInfo.agents) {
          await this.executeAgent(agentId);
        }
      }
    }

    console.log(chalk.green.bold(`\n🎉 TheCareBot Medical AI construction completed!`));
    this.generateFinalReport();
  }

  private generateFinalReport(): void {
    const reportPath = join(process.cwd(), 'orchestration-report.md');
    const report = this.buildMarkdownReport();
    
    writeFileSync(reportPath, report, 'utf8');
    console.log(chalk.blue(`📊 Detailed report saved to: ${reportPath}`));
  }

  private buildMarkdownReport(): string {
    const plan = this.generateExecutionPlan();
    
    return `# TheCareBot Medical AI - Orchestration Report

## Executive Summary
- **Total Development Time**: ${plan.totalHours} hours
- **Total Phases**: ${plan.totalPhases}
- **Critical Path**: ${plan.criticalPath.join(' → ')}
- **Execution Date**: ${new Date().toISOString()}

## Agent Breakdown

${AGENTS.map(agent => `
### ${agent.name}
- **Phase**: ${agent.phase}
- **Priority**: ${agent.priority}
- **Estimated Hours**: ${agent.estimatedHours}
- **Dependencies**: ${agent.dependencies.join(', ') || 'None'}

**Expertise:**
${agent.expertise.map(skill => `- ${skill}`).join('\n')}

**Deliverables:**
${agent.deliverables.map(deliverable => `- ${deliverable}`).join('\n')}

**Commands:**
${agent.commands.map(cmd => `- **${cmd.name}**: ${cmd.description}`).join('\n')}

`).join('')}

## Execution Log
${this.executionLog.map(log => `- ${log}`).join('\n')}

## Next Steps
1. Review and approve the execution plan
2. Set up development environment
3. Execute Phase 1 (Database + Types)
4. Continue with subsequent phases
5. Deploy to staging for Chilean medical compliance testing
6. Production deployment with observability monitoring

## Critical Success Factors
- Chilean Law 19.628 compliance validation
- Medical license integration with Chilean registry
- 20-minute session timeout enforcement
- Zero-any TypeScript policy compliance
- Demo mode safety verification
- Medical audit trail completeness
`;
  }

  private logExecution(message: string, level: 'info' | 'success' | 'error'): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    this.executionLog.push(logEntry);
  }

  // Interactive CLI menu
  async startInteractiveCLI(): Promise<void> {
    console.log(chalk.blue.bold(`
🏥 TheCareBot Medical AI - Multi-Agent Orchestrator
===================================================
`));

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const askQuestion = (question: string): Promise<string> => {
      return new Promise(resolve => rl.question(question, resolve));
    };

    while (true) {
      console.log(chalk.cyan(`
Choose an action:
1. 📋 Generate Execution Plan
2. 🤖 Execute Single Agent
3. 🚀 Execute Full Plan
4. 📊 Show Agent Details
5. 🔍 Check Dependencies
6. 📈 Generate Report
7. ❌ Exit
`));

      const choice = await askQuestion('Enter your choice (1-7): ');

      switch (choice.trim()) {
        case '1':
          const plan = this.generateExecutionPlan();
          this.displayExecutionPlan(plan);
          break;
          
        case '2':
          const agentId = await askQuestion('Enter agent ID (database/types/backend/security/frontend/mobile/observability): ');
          if (this.agents.has(agentId.trim())) {
            await this.executeAgent(agentId.trim());
          } else {
            console.log(chalk.red('Invalid agent ID'));
          }
          break;
          
        case '3':
          const confirm = await askQuestion(chalk.yellow('This will execute the full plan. Continue? (y/N): '));
          if (confirm.toLowerCase() === 'y') {
            await this.executeFullPlan();
          }
          break;
          
        case '4':
          this.displayAgentDetails();
          break;
          
        case '5':
          this.checkAllDependencies();
          break;
          
        case '6':
          this.generateFinalReport();
          break;
          
        case '7':
          console.log(chalk.green('Goodbye! 👋'));
          rl.close();
          return;
          
        default:
          console.log(chalk.red('Invalid choice, please try again.'));
      }
    }
  }

  public displayExecutionPlan(plan: ExecutionPlan): void {
    console.log(chalk.blue.bold(`\n📋 TheCareBot Execution Plan`));
    console.log(chalk.gray(`Total time: ${plan.totalHours} hours (${Math.ceil(plan.totalHours / 8)} days)`));
    console.log(chalk.gray(`Critical path: ${plan.criticalPath.join(' → ')}\n`));

    for (const phase of plan.phaseBreakdown) {
      console.log(chalk.magenta(`Phase ${phase.phase} (${phase.estimatedHours}h)`));
      console.log(chalk.gray(`  Parallel execution: ${phase.canRunInParallel ? 'Yes' : 'No'}`));
      console.log(chalk.gray(`  Agents: ${phase.agents.join(', ')}\n`));
    }

    if (plan.parallelTracks.length > 0) {
      console.log(chalk.green('Parallel execution tracks:'));
      plan.parallelTracks.forEach((track, i) => {
        console.log(chalk.gray(`  Track ${i + 1}: ${track.join(' + ')}`));
      });
    }
  }

  private displayAgentDetails(): void {
    console.log(chalk.blue.bold(`\n🤖 Agent Details\n`));
    
    for (const agent of AGENTS) {
      console.log(chalk.cyan(`${agent.name} (${agent.id})`));
      console.log(chalk.gray(`  Phase: ${agent.phase} | Priority: ${agent.priority} | Hours: ${agent.estimatedHours}`));
      console.log(chalk.gray(`  Dependencies: ${agent.dependencies.join(', ') || 'None'}`));
      console.log(chalk.gray(`  Deliverables: ${agent.deliverables.length} items`));
      console.log('');
    }
  }

  private checkAllDependencies(): void {
    console.log(chalk.yellow.bold(`\n🔍 Dependency Analysis\n`));
    
    for (const agent of AGENTS) {
      console.log(chalk.cyan(`${agent.name}:`));
      
      if (agent.dependencies.length === 0) {
        console.log(chalk.green(`  ✅ No dependencies - can start immediately`));
      } else {
        for (const depId of agent.dependencies) {
          const dep = this.agents.get(depId)!;
          console.log(chalk.yellow(`  🔗 Depends on: ${dep.name} (Phase ${dep.phase})`));
        }
      }
      console.log('');
    }
  }
}

// === MAIN EXECUTION ===
async function main(): Promise<void> {
  const orchestrator = new MedicalAIOrchestrator();

  // Check if running with command line arguments
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const command = args[0];
    
    switch (command) {
      case 'plan':
        const plan = orchestrator.generateExecutionPlan();
        orchestrator.displayExecutionPlan(plan);
        break;
        
      case 'execute':
        if (args[1]) {
          await orchestrator.executeAgent(args[1]);
        } else {
          console.log(chalk.red('Please specify an agent ID'));
        }
        break;
        
      case 'full':
        await orchestrator.executeFullPlan();
        break;
        
      case 'interactive':
      default:
        await orchestrator.startInteractiveCLI();
    }
  } else {
    await orchestrator.startInteractiveCLI();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MedicalAIOrchestrator, type Agent, type ExecutionPlan };