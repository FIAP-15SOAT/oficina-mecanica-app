terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.46.0, < 7.0.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.32.0, < 3.0.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 3.0.0, < 4.0.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

data "terraform_remote_state" "aws_base" {
  backend = "s3"

  config = {
    bucket = var.aws_base_state_bucket
    key    = var.aws_base_state_key
    region = var.aws_base_state_region
  }
}

data "aws_eks_cluster_auth" "eks_cluster_auth" {
  name = data.terraform_remote_state.aws_base.outputs.cluster_name
}

provider "kubernetes" {
  host                   = data.terraform_remote_state.aws_base.outputs.cluster_endpoint
  cluster_ca_certificate = base64decode(data.terraform_remote_state.aws_base.outputs.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.eks_cluster_auth.token
}

provider "helm" {
  kubernetes = {
    host                   = data.terraform_remote_state.aws_base.outputs.cluster_endpoint
    cluster_ca_certificate = base64decode(data.terraform_remote_state.aws_base.outputs.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.eks_cluster_auth.token
  }
}
