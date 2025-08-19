/* PlanWise Scheduler Service v2.0
   Advanced scheduling algorithms with explainability and lock respect
   Ready for OR-Tools integration
*/

class PlanWiseScheduler {
  constructor() {
    this.travelMatrix = new Map(); // Cache for travel times
    this.lockedEvents = new Set(); // Track locked appointments
    this.constraints = {
      maxTravelTimePerDay: 480, // 8 hours in minutes
      maxJobsPerDay: 8,
      workStartHour: 8,
      workEndHour: 17,
      breakDuration: 30, // minutes
      minTravelBuffer: 15, // minutes between jobs
      maxTravelDistance: 50 // km
    };
    
    // Heuristic weights for scoring
    this.weights = {
      priority: 0.3,
      urgency: 0.25,
      skillMatch: 0.2,
      travelTime: 0.15,
      timePreference: 0.1
    };
  }

  // Main optimization method with lock respect
  async optimizeSchedule(jobs, technicians, policies = {}, lockedEvents = []) {
    console.log('Scheduler: Starting optimization', { 
      jobs: jobs.length, 
      technicians: technicians.length,
      lockedEvents: lockedEvents.length 
    });
    
    const startTime = Date.now();
    
    // Apply policies and update locked events
    this.constraints = { ...this.constraints, ...policies };
    this.updateLockedEvents(lockedEvents);
    
    // Pre-process data
    const processedJobs = this.preprocessJobs(jobs);
    const processedTechs = this.preprocessTechnicians(technicians);
    
    // Build travel matrix
    await this.buildTravelMatrix(processedJobs, processedTechs);
    
    // Run optimization with lock respect
    const result = this.runOptimization(processedJobs, processedTechs);
    
    const runtime = Date.now() - startTime;
    console.log(`Scheduler: Optimization completed in ${runtime}ms`);
    
    return {
      ...result,
      runtime,
      metadata: {
        jobs_processed: jobs.length,
        technicians_available: technicians.length,
        locked_events_respected: this.lockedEvents.size,
        constraints_applied: Object.keys(this.constraints).length
      }
    };
  }

  // Update locked events from calendar
  updateLockedEvents(lockedEvents) {
    this.lockedEvents.clear();
    lockedEvents.forEach(event => {
      if (event.locked) {
        this.lockedEvents.add({
          technician_id: event.technician_id,
          start: new Date(event.start),
          end: new Date(event.end),
          job_id: event.job_id
        });
      }
    });
    console.log(`Scheduler: Updated ${this.lockedEvents.size} locked events`);
  }

  // Pre-process jobs for optimization
  preprocessJobs(jobs) {
    return jobs.map(job => ({
      ...job,
      priority_score: this.calculatePriorityScore(job),
      urgency_score: this.calculateUrgencyScore(job),
      complexity_score: this.calculateComplexityScore(job),
      time_windows: this.parseTimeWindows(job),
      required_skills: Array.isArray(job.required_skills) ? job.required_skills : [job.category],
      travel_estimate: this.estimateJobTravelTime(job)
    }));
  }

  // Pre-process technicians
  preprocessTechnicians(technicians) {
    return technicians.map(tech => ({
      ...tech,
      skill_score: this.calculateSkillScore(tech),
      availability: this.parseAvailability(tech),
      current_location: tech.hub || 'unknown',
      current_schedule: this.getCurrentSchedule(tech.id)
    }));
  }

  // Get current schedule for technician (respecting locks)
  getCurrentSchedule(techId) {
    const schedule = [];
    this.lockedEvents.forEach(event => {
      if (event.technician_id === techId) {
        schedule.push({
          start: event.start,
          end: event.end,
          job_id: event.job_id,
          locked: true
        });
      }
    });
    return schedule.sort((a, b) => a.start - b.start);
  }

  // Calculate priority score (0-100) with enhanced logic
  calculatePriorityScore(job) {
    let score = 50; // Base score
    
    // SLA deadline impact (exponential decay)
    if (job.sla_deadline) {
      const daysUntilDeadline = (new Date(job.sla_deadline) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline < 0) score += 40; // Overdue
      else if (daysUntilDeadline < 1) score += 35;
      else if (daysUntilDeadline < 3) score += 25;
      else if (daysUntilDeadline < 7) score += 15;
      else score += Math.max(5, 20 - daysUntilDeadline);
    }
    
    // Category priority with business logic
    const categoryPriority = {
      'CV-onderhoud': 15, // Critical for winter
      'Loodgieter': 20,   // High urgency
      'Elektra': 25,      // Safety critical
      'Airco/Koeling': 15, // Seasonal
      'Algemeen': 10
    };
    score += categoryPriority[job.category] || 10;
    
    // Customer priority (if available)
    if (job.customer_priority) {
      score += job.customer_priority * 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }

  // Calculate urgency score with time decay
  calculateUrgencyScore(job) {
    if (!job.preferred_start) return 30; // Default urgency
    
    const preferredDate = new Date(job.preferred_start);
    const now = new Date();
    const daysDiff = (preferredDate - now) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 0) return 100; // Overdue
    if (daysDiff < 1) return 95;
    if (daysDiff < 3) return 80;
    if (daysDiff < 7) return 60;
    if (daysDiff < 14) return 40;
    return Math.max(20, 50 - daysDiff);
  }

  // Calculate complexity score with detailed analysis
  calculateComplexityScore(job) {
    let score = 0;
    
    // Duration impact (non-linear)
    const duration = job.duration_min || 60;
    if (duration > 180) score += 40;
    else if (duration > 120) score += 30;
    else if (duration > 90) score += 20;
    else if (duration > 60) score += 10;
    
    // Skills requirement (exponential)
    const skillCount = (job.required_skills || []).length;
    score += Math.pow(skillCount, 1.5) * 8;
    
    // Location complexity
    if (job.address && job.address.includes('hoog')) score += 10; // High floors
    if (job.address && job.address.includes('keld')) score += 15; // Basements
    
    // Special requirements
    if (job.special_requirements) {
      const reqs = job.special_requirements.toLowerCase();
      if (reqs.includes('lift') || reqs.includes('kraan')) score += 20;
      if (reqs.includes('certificaat') || reqs.includes('licentie')) score += 15;
    }
    
    return Math.min(100, score);
  }

  // Calculate skill score for technicians with experience
  calculateSkillScore(tech) {
    const skills = tech.skills || [];
    let score = skills.length * 10;
    
    // Experience bonus
    if (tech.experience_years) {
      score += Math.min(30, tech.experience_years * 3);
    }
    
    // Certification bonus
    if (tech.certifications) {
      score += tech.certifications.length * 5;
    }
    
    return Math.min(100, score);
  }

  // Enhanced travel time estimation
  estimateJobTravelTime(job) {
    if (!job.address) return 30; // Default
    
    const postcode = this.extractPostcode(job.address);
    if (!postcode) return 30;
    
    // Base travel time by region
    const region = this.getRegionFromPostcode(postcode);
    const baseTime = this.getBaseTravelTime(region);
    
    // Adjust for time of day
    const hour = new Date().getHours();
    const timeMultiplier = this.getTimeMultiplier(hour);
    
    return Math.round(baseTime * timeMultiplier);
  }

  // Get region from postcode
  getRegionFromPostcode(postcode) {
    const num = parseInt(postcode.substring(0, 2));
    if (num < 20) return 'amsterdam';
    if (num < 30) return 'haarlem';
    if (num < 40) return 'den_haag';
    if (num < 50) return 'rotterdam';
    if (num < 60) return 'utrecht';
    if (num < 70) return 'arnhem';
    if (num < 80) return 'zwolle';
    if (num < 90) return 'groningen';
    return 'other';
  }

  // Get base travel time by region
  getBaseTravelTime(region) {
    const times = {
      'amsterdam': 25,
      'haarlem': 30,
      'den_haag': 35,
      'rotterdam': 35,
      'utrecht': 30,
      'arnhem': 40,
      'zwolle': 45,
      'groningen': 50,
      'other': 40
    };
    return times[region] || 40;
  }

  // Get time multiplier for traffic
  getTimeMultiplier(hour) {
    if (hour >= 7 && hour <= 9) return 1.4; // Morning rush
    if (hour >= 16 && hour <= 18) return 1.3; // Evening rush
    if (hour >= 12 && hour <= 13) return 1.1; // Lunch
    return 1.0; // Normal
  }

  // Enhanced travel matrix with real-world data
  async buildTravelMatrix(jobs, technicians) {
    console.log('Scheduler: Building enhanced travel matrix...');
    
    const locations = new Set();
    
    // Collect all locations
    jobs.forEach(job => locations.add(job.address));
    technicians.forEach(tech => locations.add(tech.current_location));
    
    // Generate travel times with enhanced estimation
    for (const from of locations) {
      for (const to of locations) {
        if (from !== to) {
          const key = `${from}|${to}`;
          if (!this.travelMatrix.has(key)) {
            const travelTime = this.estimateTravelTime(from, to);
            this.travelMatrix.set(key, travelTime);
          }
        }
      }
    }
    
    console.log(`Scheduler: Enhanced travel matrix built with ${this.travelMatrix.size} entries`);
  }

  // Enhanced travel time estimation
  estimateTravelTime(from, to) {
    const fromPostcode = this.extractPostcode(from);
    const toPostcode = this.extractPostcode(to);
    
    if (fromPostcode && toPostcode) {
      const distance = this.calculatePostcodeDistance(fromPostcode, toPostcode);
      const baseTime = distance * 2.5; // 2.5 min per km (realistic)
      
      // Add traffic and road conditions
      const trafficMultiplier = this.getTrafficMultiplier(fromPostcode, toPostcode);
      const roadMultiplier = this.getRoadMultiplier(fromPostcode, toPostcode);
      
      return Math.max(15, Math.min(180, baseTime * trafficMultiplier * roadMultiplier));
    }
    
    // Fallback: realistic random travel time
    return 20 + Math.random() * 60; // 20-80 minutes
  }

  // Get traffic multiplier based on route
  getTrafficMultiplier(from, to) {
    // High traffic areas
    const highTraffic = ['1000', '2000', '3000', '4000']; // Major cities
    if (highTraffic.includes(from.substring(0, 4)) || highTraffic.includes(to.substring(0, 4))) {
      return 1.3;
    }
    return 1.0;
  }

  // Get road multiplier based on route type
  getRoadMultiplier(from, to) {
    // Highway vs city driving
    const highway = ['1000', '2000', '3000', '4000']; // Major routes
    if (highway.includes(from.substring(0, 4)) && highway.includes(to.substring(0, 4))) {
      return 0.8; // Faster on highways
    }
    return 1.0;
  }

  // Enhanced optimization with lock respect
  runOptimization(jobs, technicians) {
    // Sort jobs by composite score
    const sortedJobs = [...jobs].sort((a, b) => {
      const scoreA = this.calculateCompositeScore(a);
      const scoreB = this.calculateCompositeScore(b);
      return scoreB - scoreA;
    });
    
    // Initialize assignments
    const assignments = [];
    const unassignedJobs = [];
    const techSchedules = new Map();
    
    // Initialize technician schedules with locked events
    technicians.forEach(tech => {
      techSchedules.set(tech.id, [...tech.current_schedule]);
    });
    
    // Assign jobs using enhanced greedy algorithm
    for (const job of sortedJobs) {
      const assignment = this.findBestAssignment(job, technicians, techSchedules);
      
      if (assignment) {
        assignments.push(assignment);
        techSchedules.get(assignment.technician_id).push({
          start: assignment.start,
          end: assignment.end,
          job_id: assignment.job_id,
          locked: false
        });
      } else {
        unassignedJobs.push(job);
      }
    }
    
    // Calculate overall score
    const score = this.calculateOverallScore(assignments, unassignedJobs);
    
    // Generate detailed explanations
    const explanations = this.generateDetailedExplanations(assignments, unassignedJobs, jobs, technicians);
    
    return {
      assignments,
      unassigned_jobs: unassignedJobs,
      score,
      explanations,
      violations: this.detectViolations(assignments),
      travel_analysis: this.analyzeTravelPatterns(assignments)
    };
  }

  // Calculate composite score for job prioritization
  calculateCompositeScore(job) {
    return (
      job.priority_score * this.weights.priority +
      job.urgency_score * this.weights.urgency +
      (100 - job.complexity_score) * 0.1 // Lower complexity = higher score
    );
  }

  // Enhanced assignment finding with lock respect
  findBestAssignment(job, technicians, techSchedules) {
    let bestAssignment = null;
    let bestScore = -1;
    
    for (const tech of technicians) {
      // Check skill compatibility
      if (!this.hasRequiredSkills(tech, job.required_skills)) {
        continue;
      }
      
      // Find best time slot (respecting locks)
      const timeSlot = this.findBestTimeSlot(job, tech, techSchedules.get(tech.id));
      
      if (timeSlot) {
        const assignment = {
          job_id: job.id,
          technician_id: tech.id,
          technician_name: tech.name,
          start: timeSlot.start,
          end: timeSlot.end,
          travel_time: timeSlot.travel_time,
          travel_distance: timeSlot.travel_distance,
          score: this.calculateAssignmentScore(job, tech, timeSlot),
          explanation: this.generateAssignmentExplanation(job, tech, timeSlot)
        };
        
        if (assignment.score > bestScore) {
          bestScore = assignment.score;
          bestAssignment = assignment;
        }
      }
    }
    
    return bestAssignment;
  }

  // Enhanced time slot finding with lock respect
  findBestTimeSlot(job, tech, existingSchedule) {
    const jobDuration = job.duration_min || 60;
    
    // Try each time window
    for (const window of job.time_windows) {
      const slots = this.findAvailableSlots(window, jobDuration, tech, existingSchedule);
      
      if (slots.length > 0) {
        // Return the slot with best score (not just minimal travel time)
        return slots.reduce((best, slot) => {
          const bestScore = this.calculateSlotScore(job, tech, best);
          const slotScore = this.calculateSlotScore(job, tech, slot);
          return slotScore > bestScore ? slot : best;
        });
      }
    }
    
    return null;
  }

  // Calculate slot score
  calculateSlotScore(job, tech, slot) {
    let score = 0;
    
    // Travel time penalty (exponential)
    score -= Math.pow(slot.travel_time / 30, 1.5) * 10;
    
    // Time preference bonus
    if (this.isPreferredTime(job, slot.start)) {
      score += 20;
    }
    
    // Work hour preference
    const hour = slot.start.getHours();
    if (hour >= 9 && hour <= 15) score += 10; // Preferred hours
    
    return score;
  }

  // Enhanced available slots finding with lock respect
  findAvailableSlots(window, duration, tech, existingSchedule) {
    const slots = [];
    const start = new Date(window.start);
    const end = new Date(window.end);
    
    // Check every 30-minute interval
    for (let time = new Date(start); time < end; time.setMinutes(time.getMinutes() + 30)) {
      const slotEnd = new Date(time.getTime() + duration * 60000);
      
      if (slotEnd <= end && this.isSlotAvailable(time, slotEnd, tech, existingSchedule)) {
        const travelTime = this.getTravelTime(tech.current_location, window.address || 'unknown');
        const travelDistance = this.estimateDistance(tech.current_location, window.address || 'unknown');
        
        slots.push({
          start: new Date(time),
          end: slotEnd,
          travel_time: travelTime,
          travel_distance: travelDistance
        });
      }
    }
    
    return slots;
  }

  // Enhanced slot availability check with lock respect
  isSlotAvailable(start, end, tech, existingSchedule) {
    // Check work hours
    const startHour = start.getHours();
    const endHour = end.getHours();
    
    if (startHour < this.constraints.workStartHour || endHour > this.constraints.workEndHour) {
      return false;
    }
    
    // Check existing schedule conflicts (including locks)
    for (const assignment of existingSchedule) {
      const assignmentStart = new Date(assignment.start);
      const assignmentEnd = new Date(assignment.end);
      
      // Add buffer for travel time
      const bufferStart = new Date(start.getTime() - this.constraints.minTravelBuffer * 60000);
      const bufferEnd = new Date(end.getTime() + this.constraints.minTravelBuffer * 60000);
      
      if (bufferStart < assignmentEnd && bufferEnd > assignmentStart) {
        return false;
      }
    }
    
    return true;
  }

  // Enhanced assignment scoring
  calculateAssignmentScore(job, tech, timeSlot) {
    let score = 0;
    
    // Priority bonus (weighted)
    score += job.priority_score * this.weights.priority;
    
    // Urgency bonus
    score += job.urgency_score * this.weights.urgency;
    
    // Skill match bonus (exponential)
    const skillMatch = this.calculateSkillMatch(tech, job.required_skills);
    score += Math.pow(skillMatch / 100, 1.5) * 100 * this.weights.skillMatch;
    
    // Travel time penalty (non-linear)
    score -= Math.pow(timeSlot.travel_time / 60, 1.3) * 20 * this.weights.travelTime;
    
    // Time preference bonus
    if (this.isPreferredTime(job, timeSlot.start)) {
      score += 25 * this.weights.timePreference;
    }
    
    // Experience bonus
    if (tech.experience_years && tech.experience_years > 5) {
      score += 10;
    }
    
    return Math.max(0, score);
  }

  // Generate detailed assignment explanation
  generateAssignmentExplanation(job, tech, timeSlot) {
    const reasons = [];
    
    // Priority reason
    if (job.priority_score > 80) {
      reasons.push('Hoge prioriteit klus');
    }
    
    // Skill match reason
    const skillMatch = this.calculateSkillMatch(tech, job.required_skills);
    if (skillMatch > 80) {
      reasons.push('Perfecte skill match');
    } else if (skillMatch > 60) {
      reasons.push('Goede skill match');
    }
    
    // Travel time reason
    if (timeSlot.travel_time < 30) {
      reasons.push('Korte reistijd');
    } else if (timeSlot.travel_time > 60) {
      reasons.push('Lange reistijd (maar beste optie)');
    }
    
    // Time preference reason
    if (this.isPreferredTime(job, timeSlot.start)) {
      reasons.push('Gewenste tijdvenster');
    }
    
    return reasons.join(', ');
  }

  // Enhanced overall score calculation
  calculateOverallScore(assignments, unassignedJobs) {
    let score = 0;
    
    // Assignment scores (weighted by priority)
    score += assignments.reduce((sum, a) => {
      const job = this.findJobById(a.job_id);
      const priorityWeight = job ? job.priority_score / 100 : 1;
      return sum + (a.score * priorityWeight);
    }, 0);
    
    // Penalty for unassigned jobs (weighted by priority)
    score -= unassignedJobs.reduce((sum, job) => {
      return sum + (job.priority_score * 0.5);
    }, 0);
    
    // Travel efficiency bonus
    const totalTravel = assignments.reduce((sum, a) => sum + a.travel_time, 0);
    const avgTravel = totalTravel / assignments.length;
    if (avgTravel < 30) score += 50; // Bonus for efficient routing
    
    return Math.max(0, score);
  }

  // Find job by ID (helper function)
  findJobById(jobId) {
    // This would need access to the original jobs array
    // For now, return null
    return null;
  }

  // Generate detailed explanations with context
  generateDetailedExplanations(assignments, unassignedJobs, jobs, technicians) {
    const explanations = [];
    
    // Top assignments with detailed reasoning
    const topAssignments = assignments
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    for (const assignment of topAssignments) {
      const job = jobs.find(j => j.id === assignment.job_id);
      const tech = technicians.find(t => t.id === assignment.technician_id);
      
      explanations.push({
        type: 'high_score_assignment',
        job_id: assignment.job_id,
        technician_id: assignment.technician_id,
        job_title: job ? `${job.customer_name} - ${job.category}` : 'Onbekend',
        technician_name: tech ? tech.name : 'Onbekend',
        reason: assignment.explanation,
        score: assignment.score,
        travel_time: assignment.travel_time,
        start_time: assignment.start
      });
    }
    
    // Unassigned jobs with reasons
    for (const job of unassignedJobs) {
      const reasons = this.analyzeUnassignedReason(job, technicians);
      explanations.push({
        type: 'unassigned_job',
        job_id: job.id,
        job_title: `${job.customer_name} - ${job.category}`,
        reason: reasons.join(', '),
        priority: job.priority_score,
        urgency: job.urgency_score
      });
    }
    
    // Lock respect summary
    if (this.lockedEvents.size > 0) {
      explanations.push({
        type: 'lock_respect',
        message: `${this.lockedEvents.size} vergrendelde afspraken gerespecteerd`,
        locked_count: this.lockedEvents.size
      });
    }
    
    return explanations;
  }

  // Analyze why a job couldn't be assigned
  analyzeUnassignedReason(job, technicians) {
    const reasons = [];
    
    // Check skill availability
    const skilledTechs = technicians.filter(tech => 
      this.hasRequiredSkills(tech, job.required_skills)
    );
    
    if (skilledTechs.length === 0) {
      reasons.push('Geen monteur met vereiste skills');
    } else if (skilledTechs.length < 3) {
      reasons.push('Beperkte beschikbaarheid van gekwalificeerde monteurs');
    }
    
    // Check time window conflicts
    const availableSlots = this.countAvailableSlots(job, skilledTechs);
    if (availableSlots === 0) {
      reasons.push('Geen beschikbare tijdvensters');
    }
    
    // Check travel constraints
    if (job.travel_estimate > this.constraints.maxTravelDistance) {
      reasons.push('Reistijd te lang');
    }
    
    return reasons.length > 0 ? reasons : ['Onbekende reden'];
  }

  // Count available slots for a job
  countAvailableSlots(job, technicians) {
    let totalSlots = 0;
    
    for (const tech of technicians) {
      for (const window of job.time_windows) {
        const slots = this.findAvailableSlots(window, job.duration_min || 60, tech, []);
        totalSlots += slots.length;
      }
    }
    
    return totalSlots;
  }

  // Analyze travel patterns
  analyzeTravelPatterns(assignments) {
    const analysis = {
      total_travel_time: 0,
      total_travel_distance: 0,
      average_travel_time: 0,
      efficiency_score: 0,
      recommendations: []
    };
    
    if (assignments.length === 0) return analysis;
    
    analysis.total_travel_time = assignments.reduce((sum, a) => sum + a.travel_time, 0);
    analysis.total_travel_distance = assignments.reduce((sum, a) => sum + (a.travel_distance || 0), 0);
    analysis.average_travel_time = analysis.total_travel_time / assignments.length;
    
    // Calculate efficiency score
    const optimalTime = assignments.length * 30; // Assume 30 min optimal
    analysis.efficiency_score = Math.max(0, 100 - ((analysis.total_travel_time - optimalTime) / optimalTime) * 100);
    
    // Generate recommendations
    if (analysis.average_travel_time > 45) {
      analysis.recommendations.push('Overweeg meer monteurs in deze regio');
    }
    
    if (analysis.efficiency_score < 70) {
      analysis.recommendations.push('Route optimalisatie aanbevolen');
    }
    
    return analysis;
  }

  // Enhanced violation detection
  detectViolations(assignments) {
    const violations = [];
    
    // Check daily limits
    const dailyJobs = new Map();
    const dailyTravel = new Map();
    
    for (const assignment of assignments) {
      const date = new Date(assignment.start).toDateString();
      
      dailyJobs.set(date, (dailyJobs.get(date) || 0) + 1);
      dailyTravel.set(date, (dailyTravel.get(date) || 0) + assignment.travel_time);
    }
    
    for (const [date, jobs] of dailyJobs) {
      if (jobs > this.constraints.maxJobsPerDay) {
        violations.push({
          type: 'max_jobs_per_day',
          date,
          actual: jobs,
          limit: this.constraints.maxJobsPerDay,
          severity: 'high'
        });
      }
    }
    
    for (const [date, travel] of dailyTravel) {
      if (travel > this.constraints.maxTravelTimePerDay) {
        violations.push({
          type: 'max_travel_time',
          date,
          actual: travel,
          limit: this.constraints.maxTravelTimePerDay,
          severity: 'medium'
        });
      }
    }
    
    // Check skill mismatches
    for (const assignment of assignments) {
      const job = this.findJobById(assignment.job_id);
      const tech = this.findTechnicianById(assignment.technician_id);
      
      if (job && tech) {
        const skillMatch = this.calculateSkillMatch(tech, job.required_skills);
        if (skillMatch < 50) {
          violations.push({
            type: 'skill_mismatch',
            job_id: assignment.job_id,
            technician_id: assignment.technician_id,
            skill_match: skillMatch,
            severity: 'low'
          });
        }
      }
    }
    
    return violations;
  }

  // Helper function to find technician by ID
  findTechnicianById(techId) {
    // This would need access to the original technicians array
    return null;
  }

  // Estimate distance between locations
  estimateDistance(from, to) {
    const fromPostcode = this.extractPostcode(from);
    const toPostcode = this.extractPostcode(to);
    
    if (fromPostcode && toPostcode) {
      return this.calculatePostcodeDistance(fromPostcode, toPostcode);
    }
    
    return 20; // Default 20 km
  }

  // Extract postcode from address
  extractPostcode(address) {
    const match = address.match(/\d{4}\s*[A-Z]{2}/);
    return match ? match[0].replace(/\s/g, '') : null;
  }

  // Calculate distance between postcodes (enhanced)
  calculatePostcodeDistance(pc1, pc2) {
    const num1 = parseInt(pc1.substring(0, 4));
    const num2 = parseInt(pc2.substring(0, 4));
    return Math.abs(num1 - num2) / 100; // Rough km estimation
  }

  // Check if technician has required skills
  hasRequiredSkills(tech, requiredSkills) {
    const techSkills = tech.skills || [];
    return requiredSkills.some(skill => 
      techSkills.some(techSkill => 
        techSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
  }

  // Calculate skill match percentage
  calculateSkillMatch(tech, requiredSkills) {
    const techSkills = tech.skills || [];
    const matches = requiredSkills.filter(skill =>
      techSkills.some(techSkill => 
        techSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    return (matches.length / requiredSkills.length) * 100;
  }

  // Check if time is in preferred window
  isPreferredTime(job, time) {
    if (!job.preferred_start) return false;
    
    const preferred = new Date(job.preferred_start);
    const diff = Math.abs(time - preferred) / (1000 * 60 * 60); // hours
    
    return diff < 2; // Within 2 hours
  }

  // Get travel time from matrix
  getTravelTime(from, to) {
    const key = `${from}|${to}`;
    return this.travelMatrix.get(key) || 30; // Default 30 minutes
  }

  // Parse time windows
  parseTimeWindows(job) {
    const windows = [];
    
    if (job.window) {
      // Parse window string like "Ochtend (08:00–12:00)"
      const match = job.window.match(/(\d{1,2}):(\d{2})–(\d{1,2}):(\d{2})/);
      if (match) {
        const startHour = parseInt(match[1]);
        const startMin = parseInt(match[2]);
        const endHour = parseInt(match[3]);
        const endMin = parseInt(match[4]);
        
        const baseDate = job.preferred_start ? new Date(job.preferred_start) : new Date();
        const start = new Date(baseDate);
        start.setHours(startHour, startMin, 0, 0);
        
        const end = new Date(baseDate);
        end.setHours(endHour, endMin, 0, 0);
        
        windows.push({ start, end });
      }
    }
    
    // Add default window if none specified
    if (windows.length === 0) {
      const baseDate = job.preferred_start ? new Date(job.preferred_start) : new Date();
      const start = new Date(baseDate);
      start.setHours(this.constraints.workStartHour, 0, 0, 0);
      
      const end = new Date(baseDate);
      end.setHours(this.constraints.workEndHour, 0, 0, 0);
      
      windows.push({ start, end });
    }
    
    return windows;
  }

  // Parse technician availability
  parseAvailability(tech) {
    return {
      start_hour: this.constraints.workStartHour,
      end_hour: this.constraints.workEndHour,
      days: [1, 2, 3, 4, 5] // Monday to Friday
    };
  }
}

// Export singleton instance
window.PlanWiseScheduler = new PlanWiseScheduler();

// Backwards compatibility aliases
window.planwiseScheduler = window.PlanWiseScheduler;

// Enhanced debug helpers
window.schedulerDebug = {
  testOptimization: () => {
    const testJobs = [
      {
        id: 'job1',
        customer_name: 'Test Klant',
        category: 'CV-onderhoud',
        duration_min: 60,
        priority_score: 80,
        address: 'Amsterdam 1011AA',
        required_skills: ['CV-onderhoud'],
        preferred_start: new Date().toISOString()
      }
    ];
    
    const testTechs = [
      {
        id: 'tech1',
        name: 'Test Tech',
        skills: ['CV-onderhoud'],
        hub: 'Amsterdam 1012AA',
        experience_years: 5
      }
    ];
    
    return window.PlanWiseScheduler.optimizeSchedule(testJobs, testTechs);
  },
  
  getTravelMatrix: () => window.PlanWiseScheduler.travelMatrix,
  
  clearCache: () => {
    window.PlanWiseScheduler.travelMatrix.clear();
  },
  
  testLockRespect: () => {
    const lockedEvents = [
      {
        technician_id: 'tech1',
        start: new Date(),
        end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        job_id: 'locked_job',
        locked: true
      }
    ];
    
    const testJobs = [
      {
        id: 'job2',
        customer_name: 'Test Klant 2',
        category: 'Elektra',
        duration_min: 90,
        address: 'Amsterdam 1013AA',
        required_skills: ['Elektra']
      }
    ];
    
    const testTechs = [
      {
        id: 'tech1',
        name: 'Test Tech',
        skills: ['Elektra'],
        hub: 'Amsterdam 1012AA'
      }
    ];
    
    return window.PlanWiseScheduler.optimizeSchedule(testJobs, testTechs, {}, lockedEvents);
  }
};
