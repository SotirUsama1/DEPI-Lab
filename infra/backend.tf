terraform {
  backend "s3" {
    bucket       = "depi-lab-s3"
    key          = "k8s-cluster/terraform.tfstate"
    region       = "eu-west-3"
    encrypt      = true
    use_lockfile = true
  }
}
