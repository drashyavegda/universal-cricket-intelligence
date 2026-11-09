"""Background workers.

There is no job queue in this phase. The worker below is a **polling loop skeleton** with correct
shutdown behaviour; ``tasks`` defines the job contract so a queue can be attached in phase 4 without
changing call sites.
"""
