# Provider configuration
aws_region  = "eu-west-3" # Paris
aws_profile = "aws-sotir"

# Global Context variables (To avoid issues, only lowercase alphanumeric characters and hyphens allowed)
owner_name   = "sotir"
org_name     = "depi"
project_name = "lab"
env_name     = ""

vpc_enable_dns_support   = true
vpc_enable_dns_hostnames = true

vpc_count                = 1
vpc_az_count             = 1
vpc_public_subnet_count  = 1
vpc_private_subnet_count = 0